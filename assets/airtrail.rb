# frozen_string_literal: true

# Run by `rails runner`: saves one user's AirTrail settings through the Integrations page's own code, then starts a sync.

user = User.find(Integer(ENV.fetch('STARTOS_USER_ID')))
url = ENV.fetch('STARTOS_URL')
api_key = ENV.fetch('STARTOS_API_KEY')

# Settings::Update saves even when its connection test fails; a failed reconnect must keep the old settings.
if url.present?
  test = AirTrail::ConnectionTester.new(url, api_key).call
  unless test[:success]
    puts "STARTOS_ALERT=#{test[:error]}"
    exit 2
  end
end

result = Settings::Update.new(
  user,
  { 'airtrail_url' => url, 'airtrail_api_key' => api_key, 'airtrail_skip_ssl_verification' => false }
).call

result[:alerts].each { |alert| puts "STARTOS_ALERT=#{alert}" }
exit 2 unless result[:success]
# Clearing the URL always fails the connection test.
exit 2 if url.present? && result[:alerts].any?
AirTrail::ImportFlightsJob.perform_later(user.id) if url.present?
