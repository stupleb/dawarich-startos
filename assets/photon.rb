# frozen_string_literal: true

# Run by `rails runner`: sets Dawarich's address lookups through the Instance settings page's own code.

host = ENV.fetch('STARTOS_PHOTON_HOST')
expected = ENV['STARTOS_PHOTON_EXPECT']

# A host the admin changed under Settings → Instance stays theirs.
if expected && InstanceSettings::Resolver.value(:photon_api_host) != expected
  puts 'STARTOS_PHOTON=kept'
  exit 0
end

input = InstanceSettings::GeocodingInput.new(
  host.empty? ? { photon_api_host: nil } : { photon_api_host: host, photon_api_use_https: false }
)
abort input.errors.join(' ') unless input.valid?
input.values.each { |key, value| InstanceSettings::Resolver.set(key, value) }
puts 'STARTOS_PHOTON=written'
