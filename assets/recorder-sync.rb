# frozen_string_literal: true

# Mirrors OwnTracks Recorder users into Dawarich accounts; README.md § Dependencies describes the cycle.

require 'json'
require 'net/http'
require 'open3'
require 'time'
require 'tempfile'
require 'fileutils'

REC_DIR = ENV.fetch('RECORDER_REC_DIR')
STATE_DIR = ENV.fetch('SYNC_STATE_DIR')
BASE_URL = URI(ENV.fetch('DAWARICH_URL'))
POLL_SECONDS = Integer(ENV.fetch('SYNC_POLL_SECONDS', '15'))
LINKS = JSON.parse(ENV.fetch('SYNC_LINKS'))
STATE_PATH = File.join(STATE_DIR, 'state.json')
STATUS_PATH = File.join(STATE_DIR, 'status.json')

$stdout.sync = true
%w[INT TERM].each { |signal| trap(signal) { exit } }

# The health check translates `code`; the message is the detail it shows alongside.
class SyncError < StandardError
  attr_reader :code

  def initialize(code, detail = code)
    super(detail)
    @code = code
  end
end

def log(message)
  puts "[recorder-sync] #{message}"
end

def write_json(path, data)
  tmp = "#{path}.tmp"
  File.write(tmp, JSON.generate(data))
  File.rename(tmp, path)
end

def read_json(path)
  JSON.parse(File.read(path))
rescue Errno::ENOENT, JSON::ParserError
  {}
end

def api_key_for(user_id)
  out, status = Open3.capture2(
    'psql', '-tA', '-v', 'ON_ERROR_STOP=1', '-c',
    "SELECT api_key FROM users WHERE id = #{Integer(user_id)}"
  )
  raise SyncError.new('database', "psql exit #{status.exitstatus}") unless status.success?

  key = out.strip
  raise SyncError, 'account_missing' if key.empty?

  key
end

def http
  Net::HTTP.start(BASE_URL.host, BASE_URL.port, open_timeout: 10, read_timeout: 120) { |h| yield h }
end

def check!(response)
  raise SyncError, 'api_key_rejected' if response.code == '401'
  return response if response.code.start_with?('2')

  raise SyncError.new('http', "Dawarich answered HTTP #{response.code}: #{response.body.to_s[0, 200]}")
end

def post_point(api_key, payload)
  request = Net::HTTP::Post.new("/api/v1/owntracks/points?api_key=#{api_key}")
  request['Content-Type'] = 'application/json'
  request.body = JSON.generate(payload)
  http { |h| check!(h.request(request)) }
end

def upload_import(api_key, filename, body)
  Tempfile.create(['recorder', '.rec']) do |file|
    file.binmode
    file.write(body)
    file.flush
    file.rewind
    request = Net::HTTP::Post.new('/api/v1/imports')
    request['Authorization'] = "Bearer #{api_key}"
    request.set_form([['file', file, { filename: filename, content_type: 'application/octet-stream' }]],
                     'multipart/form-data')
    JSON.parse(http { |h| check!(h.request(request)) }.body).fetch('id')
  end
end

def import_status(api_key, id)
  request = Net::HTTP::Get.new("/api/v1/imports/#{Integer(id)}")
  request['Authorization'] = "Bearer #{api_key}"
  response = http { |h| h.request(request) }
  return { 'status' => 'deleted' } if response.code == '404'

  JSON.parse(check!(response).body)
end

# A .rec line is "<timestamp>\t<subtopic>\t<json>"; subtopic "*" is the device's own topic, where locations go.
def location_payload(line, user, device)
  _stamp, subtopic, json = line.split("\t", 3)
  return nil unless json && subtopic.strip == '*'

  payload = JSON.parse(json)
  return nil unless payload.is_a?(Hash) && payload['_type'] == 'location'

  payload['topic'] ||= "owntracks/#{user}/#{device}"
  payload
rescue JSON::ParserError
  nil
end

# Dawarich converts OwnTracks speed from km/h only for records carrying a topic, which MQTT-received lines lack.
def with_topics(text, user, device)
  text.each_line.map do |line|
    payload = location_payload(line.chomp, user, device)
    next line unless payload

    stamp, subtopic, = line.split("\t", 3)
    "#{stamp}\t#{subtopic}\t#{JSON.generate(payload)}\n"
  end.join
end

def complete_lines(path, from)
  size = File.size(path)
  return ['', from] if size <= from

  chunk = File.open(path, 'rb') do |io|
    io.seek(from)
    io.read(size - from)
  end
  last_newline = chunk.rindex("\n")
  return ['', from] unless last_newline

  complete = chunk[0..last_newline]
  [complete, from + complete.bytesize]
end

def rec_files(user)
  Dir.glob(File.join(REC_DIR, user, '*', '*.rec')).sort
end

def rel_path(user, path)
  path.delete_prefix(File.join(REC_DIR, user, ''))
end

# Months are files named YYYY-MM.rec, so each device's newest location is near the end of its last file.
def newest_location(user)
  Dir.glob(File.join(REC_DIR, user, '*')).filter_map do |device_dir|
    latest = Dir.glob(File.join(device_dir, '*.rec')).max
    next unless latest

    tail = File.open(latest, 'rb') do |io|
      io.seek([io.size - 65_536, 0].max)
      io.read
    end
    tail.each_line.filter_map { |line| location_payload(line.chomp, user, '')&.dig('tst')&.to_i }.max
  end.max
end

# Uploads each month as a Dawarich import, and counts it done only once Dawarich reports the import completed.
def backfill(user, entry, api_key, save)
  pending = entry['pending'] ||= {}
  failed = entry['failed'] ||= {}

  pending.keys.each do |rel|
    item = pending[rel]
    import = import_status(api_key, item['importId'])
    case import['status']
    when 'completed', 'deleted'
      entry['offsets'][rel] = item['offset']
      log "#{user}: Dawarich imported #{rel}" if import['status'] == 'completed'
    when 'failed'
      reason = import['error_message'].to_s.strip
      failed[rel] = reason.empty? ? 'no reason given' : reason
      log "#{user}: Dawarich could not import #{rel}: #{failed[rel]}"
    else
      next
    end
    pending.delete(rel)
    save.call
  end

  rec_files(user).each do |path|
    rel = rel_path(user, path)
    next if entry['offsets'].key?(rel) || pending.key?(rel) || failed.key?(rel)

    device = File.basename(File.dirname(path))
    text, offset = complete_lines(path, 0)
    if text.empty?
      entry['offsets'][rel] = offset
    else
      id = upload_import(api_key, "owntracks-#{user}-#{device}-#{File.basename(path)}", with_topics(text, user, device))
      pending[rel] = { 'importId' => id, 'offset' => offset }
      log "#{user}: uploaded #{rel}"
    end
    save.call
  end
  entry['backfilled'] = pending.empty?
end

def follow(user, entry, api_key, save)
  rec_files(user).each do |path|
    rel = rel_path(user, path)
    next if entry['failed']&.key?(rel)

    device = File.basename(File.dirname(path))
    offset = entry['offsets'][rel] || 0
    offset = 0 if File.size(path) < offset
    text, = complete_lines(path, offset)
    text.each_line do |line|
      payload = location_payload(line.chomp, user, device)
      post_point(api_key, payload) if payload
      offset += line.bytesize
      entry['offsets'][rel] = offset
    end
    save.call
  end
end

FileUtils.mkdir_p(STATE_DIR)
state = read_json(STATE_PATH)
state['links'] ||= {}
# A failed import is retried once per start.
state['links'].each_value do |entry|
  next unless entry['failed']&.any?

  entry.delete('failed')
  entry['backfilled'] = false
end
save = -> { write_json(STATE_PATH, state) }
api_keys = {}

log "following #{LINKS.map { |l| l['recorderUser'] }.join(', ')}"

loop do
  statuses = {}
  LINKS.each do |link|
    user = link['recorderUser']
    key = "#{user}->#{link['userId']}"
    entry = (state['links'][key] ||= { 'backfilled' => false, 'offsets' => {} })
    status = (statuses[user] = { 'userId' => link['userId'] })

    attempts = 0
    begin
      attempts += 1
      api_keys[key] ||= api_key_for(link['userId'])
      if entry['backfilled']
        follow(user, entry, api_keys[key], save)
      else
        backfill(user, entry, api_keys[key], save)
      end
      save.call
      rel, reason = entry['failed']&.first
      if rel
        status.merge!('state' => 'error', 'code' => 'import_failed', 'detail' => "#{rel} (#{reason})")
      else
        status['state'] = entry['backfilled'] ? 'ok' : 'importing'
      end
    rescue SyncError => e
      if e.code == 'api_key_rejected'
        api_keys.delete(key)
        retry if attempts < 2
      end
      save.call
      status.merge!('state' => 'error', 'code' => e.code, 'detail' => e.message)
      log "#{user}: #{e.message}"
    rescue StandardError => e
      save.call
      status.merge!('state' => 'error', 'code' => 'other', 'detail' => e.message)
      log "#{user}: #{e.message}"
    end

    newest = newest_location(user)
    status['newestAt'] = Time.at(newest).utc.iso8601 if newest
  end
  write_json(STATUS_PATH, { 'updatedAt' => Time.now.utc.iso8601, 'links' => statuses })
  sleep POLL_SECONDS
end
