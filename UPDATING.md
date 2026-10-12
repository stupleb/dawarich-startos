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
     app/services/settings/update.rb app/services/immich/connection_tester.rb
   ```

   - `docker/web-entrypoint.sh` and `docker/sidekiq-entrypoint.sh` run as-is; a new step there needs nothing. A new required variable or service in `docker/docker-compose.yml` needs adding to `startos/utils.ts` / `startos/main.ts`.
   - `db/seeds.rb` must still create the demo account only when there are no users — the package creates its admin before the seed runs, and that is the whole guarantee.
   - The Recorder sync (`assets/recorder-sync.rb`) depends on the OwnTracks endpoint, the imports API, and Dawarich converting OwnTracks speed only when `topic` is present.
   - `assets/admin.rb` depends on the `User` model's attributes.
   - `assets/immich.rb` depends on `Immich::ConnectionTester.new(url, api_key).call` returning `success`/`error`, and on `Settings::Update.new(user, params, refresh_photos_cache:).call` returning `success`/`alerts`.
   - `DOMAIN` must stay limited to links in outgoing emails (`grep -rn "ENV.*DOMAIN" app config lib` at the new tag): it falls back to another address while the chosen one is gone, which would be wrong for a URL Dawarich stores.

4. Build, install over an existing instance, and check the web and background-job health checks, a sign-in, a linked Recorder user, and Connect Immich for an account.

## Supporting images

- **`postgis/Dockerfile`** pins `postgres:<17.x>-trixie` and installs `postgresql-17-postgis-3` from PostgreSQL's apt repository at build time. Move the 17.x minor freely. Never change the major version without a migration that dumps and restores the database: a new major cannot read the old cluster.
- **`valkey/valkey`**: move within the same major freely. Its data is a job queue and cache.
