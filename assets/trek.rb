# frozen_string_literal: true

# Run by `rails runner`: saves or removes one user's TREK source the way Settings::TrekSourcesController does.

user = User.find(Integer(ENV.fetch('STARTOS_USER_ID')))
url = ENV.fetch('STARTOS_URL')
api_key = ENV.fetch('STARTOS_API_KEY')

if url.blank?
  # The source holding this key goes and its trips stay, as when TREK is disconnected in Dawarich.
  user.trip_sources.where(provider: 'trek').find_each do |source|
    next unless source.api_key == api_key

    source.with_lock do
      source.trips.find_each { |trip| trip.update!(trip_source: nil, source_status: :stopped) }
      source.destroy!
    end
  end
  exit 0
end

source = user.trip_sources.find_or_initialize_by(provider: 'trek', base_url: url.strip.chomp('/'))
attributes = { api_key: api_key, skip_ssl_verification: false, status: :active, last_error: nil }
alert = nil
begin
  source.assign_attributes(attributes)
  if source.valid?
    Trek::Client.new(source).trips
    source.reload if source.persisted?
    source.with_lock do
      if source.persisted? && source.importing?
        alert = I18n.t('settings.trek_sources.sync.source_importing')
      else
        source.assign_attributes(attributes)
        source.save!
      end
    end
  else
    alert = source.errors.full_messages.to_sentence
  end
rescue Trek::Client::Error => e
  alert = e.message
end

if alert
  puts "STARTOS_ALERT=#{alert}"
  exit 2
end
