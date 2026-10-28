# frozen_string_literal: true

# Run by `rails runner` in `setup`, before Sidekiq starts; README.md § Image and Container Runtime says why.

# A Place name holds at most 255 characters, and every Area becomes a Place.
areas = Area.where('char_length(name) > 255').update_all('name = left(name, 255)')
puts "Shortened #{areas} area names to 255 characters" if areas.positive?

# Scoring a visit that has no confidence yet reads the coordinates of every point in it.
points = Point.where(lonlat: nil, visit_id: Visit.where(confidence: nil).select(:id)).update_all(visit_id: nil)
puts "Detached #{points} points without coordinates from unscored visits" if points.positive?
