# AGENTS.md

This is a StartOS service-package repository — it builds a `.s9pk` for StartOS.

Develop it inside a StartOS packaging workspace created by `start-cli s9pk init-workspace`,
which provides the packaging guide and agent context one level up. If you're reading this in a
bare clone with no workspace, the full guide is at <https://docs.start9.com/packaging>.

- **Nothing may run upstream's `db:seed` before `setup` has created the admin.** The seed creates `demo@dawarich.app` / `safepassword` whenever the users table is empty, which is why `web` (whose entrypoint seeds) requires `admin-applied`.
- **Don't set Dawarich's instance-setting variables** (`PHOTON_API_HOST`, `GEOAPIFY_API_KEY`, `STORE_GEODATA`, …) from `main.ts`: each one pins its field read-only under Settings → Instance.
- **Keep `assets/recorder-sync.rb` on Dawarich's public API** (`/api/v1/imports`, `/api/v1/owntracks/points`) and Ruby's standard library. `rails runner` calls into Dawarich's internals break on upgrades, and the script runs with plain `ruby`, not `bundle exec`.
- **Keep `assets/immich.rb` on `Settings::Update`.** Dawarich's public settings API stores the Immich fields without testing them or recording the connection status the Integrations page shows.
- **`healthChecks` in `dependencies.ts` are OwnTracks Recorder's daemon ids** (`mosquitto`, `recorder` in that package's `main.ts`). Check them whenever the Recorder's `versionRange` moves: a renamed daemon reads as a failing check on Dawarich's page.
- **Keep `immichConnections` out of `main.ts`'s `.const()` reads.** The Immich health check writes it through `main`'s effects, and the SDK cancels a write that changes a value the same context watches.
