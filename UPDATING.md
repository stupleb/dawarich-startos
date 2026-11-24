# Updating the upstream version

"Upstream" is the Dawarich Docker image `freikin/dawarich`, pinned by tag in `startos/manifest/index.ts` (`images.dawarich.source.dockerTag`). Tags are plain semver with no `v` prefix, matching the GitHub release tags. The two supporting images are pinned beside it: `valkey/valkey` in the manifest, and the PostgreSQL base in `postgis/Dockerfile`.

## Determining the upstream version

```bash
gh release view -R Freika/dawarich --json tagName -q .tagName
curl -s "https://hub.docker.com/v2/repositories/freikin/dawarich/tags/<version>" | jq -r '.images[] | .architecture'
```

Confirm the image tag exists for `amd64` and `arm64` before pinning it. Dawarich releases several times a week, and upstream warns against updating blindly: read `CHANGELOG.md` between the old and new versions, especially every **Upgrade notes** and **Breaking** section.

## Applying the bump

1. Set `images.dawarich.source.dockerTag` to `freikin/dawarich:<version>`.

2. Set `startos/versions/current.ts` to `<version>:0` and write release notes per the workspace's release-note rules. When the version already there has an `up` that does work, first move it into its own file under `startos/versions/` and list it in `other` in `index.ts`.
3. Diff what the package runs or depends on between the two tags:

   ```bash
   git -C <dawarich clone> diff <old>..<new> -- docker/ db/seeds.rb config/environments/production.rb lib/smtp_config.rb \
     app/controllers/api/v1/owntracks app/controllers/api/v1/imports_controller.rb app/services/own_tracks/params.rb \
     app/services/settings/update.rb app/services/immich/connection_tester.rb \
     app/services/concerns/url_validatable.rb app/services/integrations/transport.rb \
     app/services/instance_settings app/services/geocoding/config.rb app/services/air_trail app/jobs/air_trail \
     app/services/trek app/controllers/settings/trek_sources_controller.rb app/models/trip_source.rb \
     config/puma.rb config/initializers/sidekiq.rb lib/dawarich/embedded_sidekiq.rb
   ```

   - `docker/web-entrypoint.sh` and `docker/sidekiq-entrypoint.sh` run as-is; a new step there needs nothing. A new required variable or service in `docker/docker-compose.yml` needs adding to `startos/utils.ts` / `startos/main.ts`.
   - `db/seeds.rb` must still create the demo account only when there are no users — the package creates its admin before the seed runs, and that is the whole guarantee.
   - The Recorder sync (`assets/recorder-sync.rb`) depends on the OwnTracks endpoint, the imports API, and Dawarich converting OwnTracks speed only when `topic` is present.
   - `assets/admin.rb` depends on the `User` model's attributes.
   - Connect Immich and Connect AirTrail save `http://10.0.3.1:<port>` URLs, so Dawarich must keep allowing private addresses for integrations while `SELF_HOSTED=true` (`url_validatable.rb`).
   - `assets/immich.rb` depends on `Immich::ConnectionTester.new(url, api_key).call` returning `success`/`error`, and on `Settings::Update.new(user, params, refresh_photos_cache:).call` returning `success`/`alerts`.
   - `assets/airtrail.rb` depends on `AirTrail::ConnectionTester.new(url, api_key).call` returning `success`/`error`, on `Settings::Update` recording `airtrail_url` / `airtrail_api_key` / `airtrail_skip_ssl_verification`, and on `AirTrail::ImportFlightsJob.perform_later(user_id)`. Dawarich must keep calling AirTrail with only GET requests that the key's `flight.read.own` and `tracks.read` cover: `/api/flight/list?scope=mine`, `/api/v1/flights` and `/api/v1/flights/<id>/track`.
   - `assets/trek.rb` repeats `Settings::TrekSourcesController#create` and `#destroy`: the source found by `provider` and `base_url`, the test `Trek::Client.new(source).trips`, the refusal while `importing?`, and trips unlinked with `trip_source: nil, source_status: :stopped`. Carry a change there into the script. `requestTrekAccess` in `startos/utils.ts` asks for every TREK section `Trek::Itinerary` reads; a section it starts reading needs its scope added.
   - `assets/photon.rb` depends on `InstanceSettings::GeocodingInput.new(values)` (`valid?`, `errors`, normalized `values`) and `InstanceSettings::Resolver.set` / `.value` for `photon_api_host` and `photon_api_use_https`, and on Dawarich adding `/reverse` to a bare `host:port`.
   - `config/puma.rb` and `lib/dawarich/embedded_sidekiq.rb` decide whether jobs also run inside Puma. The package runs them in its own `sidekiq` daemon with `SIDEKIQ_EMBEDDED=false`; a new variable that turns embedded jobs on needs the same treatment.
   - `DOMAIN` must stay limited to links in outgoing emails (`grep -rn "ENV.*DOMAIN" app config lib` at the new tag): it falls back to another address while the chosen one is gone, which would be wrong for a URL Dawarich stores.

4. Build, install over an existing instance, and check the web and background-job health checks, a sign-in, a linked Recorder user, Connect Immich for an account, Connect AirTrail for an account, Connect TREK with a trip imported, and Connect Photon with a new location getting its address.

## Supporting images

- **`postgis/Dockerfile`** pins `postgres:<17.x>-trixie` and installs `postgresql-17-postgis-3` from PostgreSQL's apt repository at build time, with `postgresql-17` beside it so the server moves to the 17.x that PostGIS was built for. Move the 17.x minor freely. Never change the major version without a migration that dumps and restores the database: a new major cannot read the old cluster.
- **`valkey/valkey`**: move within the same major freely. Its data is a job queue and cache.
