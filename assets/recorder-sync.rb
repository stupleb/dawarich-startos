# frozen_string_literal: true

# Mirrors OwnTracks Recorder users into Dawarich accounts. Each link first
# uploads the user's existing .rec files through Dawarich's imports API, then
# follows those files and forwards every new location to Dawarich's OwnTracks
# endpoint. Progress is kept as byte offsets, so a restart resumes where it
# stopped.

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

class AuthError < StandardError; end

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
  raise "Could not read Dawarich accounts (psql exit #{status.exitstatus})" unless status.success?

  key = out.strip
  raise "Dawarich account #{user_id} no longer exists" if key.empty?

  key
end

def http
  Net::HTTP.start(BASE_URL.host, BASE_URL.port, open_timeout: 10, read_timeout: 120) { |h| yield h }
end

def check!(response)
  raise AuthError, 'Dawarich rejected the API key' if response.code == '401'
  return if response.code.start_with?('2')

  raise "Dawarich answered HTTP #{response.code}: #{response.body.to_s[0, 200]}"
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
    http { |h| check!(h.request(request)) }
  end
end

# A .rec line is "<timestamp>\t<subtopic>\t<json>"; "*" marks a publish to the
# device's own topic, which is where locations go.
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

# Dawarich converts OwnTracks speed from km/h only when a record carries its
# topic, which the Recorder does not store for MQTT publishes.
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

def backfill(link, entry, api_key)
  user = link['recorderUser']
  rec_files(user).each do |path|
    rel = path.delete_prefix(File.join(REC_DIR, user, ''))
    next if entry['offsets'].key?(rel)

    device = File.basename(File.dirname(path))
    text, offset = complete_lines(path, 0)
    unless text.empty?
      upload_import(api_key, "owntracks-#{user}-#{device}-#{File.basename(path)}", with_topics(text, user, device))
      log "#{user}: imported #{rel}"
    end
    entry['offsets'][rel] = offset
    yield
  end
  entry['backfilled'] = true
end

def follow(link, entry, api_key, status)
  user = link['recorderUser']
  rec_files(user).each do |path|
    rel = path.delete_prefix(File.join(REC_DIR, user, ''))
    device = File.basename(File.dirname(path))
    offset = entry['offsets'][rel] || 0
    offset = 0 if File.size(path) < offset
    text, _end = complete_lines(path, offset)
    text.each_line do |line|
      payload = location_payload(line.chomp, user, device)
      if payload
        post_point(api_key, payload)
        status['forwarded'] = status.fetch('forwarded', 0) + 1
        status['lastPointAt'] = Time.at(payload['tst'].to_i).utc.iso8601 if payload['tst']
      end
      offset += line.bytesize
      entry['offsets'][rel] = offset
    end
    yield
  end
end

FileUtils.mkdir_p(STATE_DIR)
state = read_json(STATE_PATH)
state['links'] ||= {}
statuses = {}
api_keys = {}

log "following #{LINKS.map { |l| l['recorderUser'] }.join(', ')}"

loop do
  LINKS.each do |link|
    key = "#{link['recorderUser']}->#{link['userId']}"
    entry = (state['links'][key] ||= { 'backfilled' => false, 'offsets' => {} })
    status = (statuses[link['recorderUser']] ||= { 'userId' => link['userId'] })
    save = -> { write_json(STATE_PATH, state) }

    attempts = 0
    begin
      attempts += 1
      api_keys[key] ||= api_key_for(link['userId'])
      if entry['backfilled']
        follow(link, entry, api_keys[key], status, &save)
      else
        status['state'] = 'importing'
        write_json(STATUS_PATH, { 'updatedAt' => Time.now.utc.iso8601, 'links' => statuses })
        backfill(link, entry, api_keys[key], &save)
      end
      save.call
      status['state'] = 'ok'
      status.delete('error')
    rescue AuthError
      api_keys.delete(key)
      retry if attempts < 2
      status['state'] = 'error'
      status['error'] = 'Dawarich rejected the account\'s API key'
    rescue StandardError => e
      save.call
      status['state'] = 'error'
      status['error'] = e.message
      log "#{link['recorderUser']}: #{e.message}"
    end
  end

  write_json(STATUS_PATH, { 'updatedAt' => Time.now.utc.iso8601, 'links' => statuses })
  sleep POLL_SECONDS
end
