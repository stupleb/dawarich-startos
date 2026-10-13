# frozen_string_literal: true

# Run by `rails runner`: saves one user's Immich settings through the Integrations page's own code.

user = User.find(Integer(ENV.fetch('STARTOS_USER_ID')))
url = ENV.fetch('STARTOS_IMMICH_URL')
api_key = ENV.fetch('STARTOS_IMMICH_API_KEY')

# Settings::Update saves even when its connection test fails; a failed reconnect must keep the old settings.
if url.present?
  test = Immich::ConnectionTester.new(url, api_key).call
  unless test[:success]
    puts "STARTOS_IMMICH_ALERT=#{test[:error]}"
    exit 2
  end
end

result = Settings::Update.new(
  user,
  { 'immich_url' => url, 'immich_api_key' => api_key, 'immich_skip_ssl_verification' => false },
  refresh_photos_cache: true
).call

result[:alerts].each { |alert| puts "STARTOS_IMMICH_ALERT=#{alert}" }
exit 2 unless result[:success]
# Clearing the URL always fails the connection test.
exit 2 if url.present? && result[:alerts].any?
