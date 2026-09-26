# frozen_string_literal: true

# Runs under `bin/rails runner`. Creates the admin account on an empty install
# (before db:seed, whose demo account is only created when no users exist), and
# with STARTOS_ADMIN_APPLY=true sets the admin's password.

email = ENV.fetch('STARTOS_ADMIN_EMAIL')
password = ENV.fetch('STARTOS_ADMIN_PASSWORD')

if User.none?
  user = User.create!(
    email:,
    password:,
    password_confirmation: password,
    admin: true,
    status: :active,
    active_until: 100.years.from_now
  )
  puts "STARTOS_ADMIN_EMAIL=#{user.email}"
  exit
end

exit unless ENV['STARTOS_ADMIN_APPLY'] == 'true'

user = User.find_by(email:) || User.where(admin: true).order(:id).first
abort 'No admin account exists' unless user

user.password = password
user.password_confirmation = password
user.save!
user.unlock_access! if user.access_locked?
puts "STARTOS_ADMIN_EMAIL=#{user.email}"
