# frozen_string_literal: true

# Run by `rails runner`; README.md § Installation and First-Run Flow and § Actions describe each STARTOS_ADMIN_* mode.

email = ENV.fetch('STARTOS_ADMIN_EMAIL').strip.downcase
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

user = User.where(admin: true).order(:id).first
abort 'No admin account exists' unless user

if user.email != email
  if User.where.not(id: user.id).exists?(email:)
    abort "STARTOS_ADMIN_EMAIL_TAKEN=#{email}" if ENV['STARTOS_ADMIN_STRICT'] == 'true'

    warn "#{email} belongs to another account; the admin keeps #{user.email}"
  else
    user.email = email
  end
end

user.password = password
user.password_confirmation = password
user.save!
user.unlock_access! if user.access_locked?
puts "STARTOS_ADMIN_EMAIL=#{user.email}"
