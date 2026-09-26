<p align="center">
  <img src="icon.svg" alt="Dawarich Logo" width="21%">
</p>

# Dawarich on StartOS

> Everything not listed in this document should behave the same as upstream
> Dawarich. If a feature, setting, or behavior is not mentioned here, the
> upstream documentation is accurate and fully applicable — see the
> Documentation section of `instructions.md` for links.

[Dawarich](https://github.com/Freika/dawarich) keeps a location history — from phone apps, from imported Google Takeout and other files — and shows it as a map, timeline, visits, trips and statistics. This package runs it with its database and job queue, creates the admin account itself so the upstream demo account never exists, and can mirror the users of the OwnTracks Recorder package into Dawarich accounts.

- **Upstream repo:** <https://github.com/Freika/dawarich>
- **Wrapper repo:** <https://github.com/stupleb/dawarich-startos>

---

## Table of Contents

- [Image and Container Runtime](#image-and-container-runtime)
- [Volume and Data Layout](#volume-and-data-layout)
- [File Models](#file-models)
- [Dependencies](#dependencies)
- [Network Access and Interfaces](#network-access-and-interfaces)
- [Installation and First-Run Flow](#installation-and-first-run-flow)
- [Actions](#actions)
- [Tasks](#tasks)
- [Health Checks](#health-checks)
- [Backups and Restore](#backups-and-restore)
- [Limitations and Differences](#limitations-and-differences)
- [Quick Reference for AI Consumers](#quick-reference-for-ai-consumers)

---

## Image and Container Runtime

Three images run as five processes. The Dawarich image is upstream's, unmodified; the database image is built by this package, because upstream's PostGIS image is published for x86_64 only.

| Image      | Source                                                                                            | Architectures   |
| ---------- | ------------------------------------------------------------------------------------------------- | --------------- |
| `dawarich` | `freikin/dawarich`, unmodified                                                                    | x86_64, aarch64 |
| `postgres` | `postgis/Dockerfile`: the official `postgres` image plus PostGIS from PostgreSQL's apt repository | x86_64, aarch64 |
| `valkey`   | `valkey/valkey` (Alpine)                                                                          | x86_64, aarch64 |

| Subcontainer    | Runs                                                | Purpose                                                                  |
| --------------- | --------------------------------------------------- | ------------------------------------------------------------------------ |
| `postgres`      | daemon `postgres`                                   | PostgreSQL with PostGIS, listening on `127.0.0.1` only                   |
| `valkey`        | daemon `valkey`                                     | Redis-compatible store for Sidekiq's queue, Rails' cache and ActionCable |
| `dawarich`      | oneshot `setup`, daemons `web` and `sidekiq`        | The Rails app and its background worker, sharing one filesystem          |
| `recorder-sync` | daemon `recorder-sync`, only while a user is linked | Follows OwnTracks Recorder's files (see [Dependencies](#dependencies))   |

Start order: `postgres` and `valkey` → `setup` → `admin-applied` (clears the pending-password flag once `setup` has applied it) → `web` → `sidekiq` and `recorder-sync`.

- **`setup`** installs this server's root CA into the container's trust store, runs `rails db:migrate`, and runs `assets/admin.rb` under `rails runner` — which creates the admin account on an empty database, and applies a password the Set Admin Password action could not apply itself.
- **`web`** runs upstream's `web-entrypoint.sh` (migrations, data migrations, `db:seed`, then Puma on port 3000 with one worker).
- **`sidekiq`** runs upstream's `sidekiq-entrypoint.sh` with three job threads.
- **`recorder-sync`** runs `assets/recorder-sync.rb`, a stdlib-only Ruby script, in its own subcontainer of the Dawarich image.

Every Rails process runs with `RAILS_ENV=production` and `SELF_HOSTED=true`, so Dawarich Cloud's analytics scripts, billing and version check are off.

## Volume and Data Layout

Four volumes. Only the database and the files Dawarich stores are user data; the rest is package state or rebuildable.

| Volume    | Mount point                                       | Contents                                                                       |
| --------- | ------------------------------------------------- | ------------------------------------------------------------------------------ |
| `startos` | — (host side)                                     | `store.json`                                                                   |
| `main`    | its `storage/` at `/var/app/storage` (`dawarich`) | Active Storage: uploaded import files, exports, posters, route videos          |
| `main`    | its `recorder-sync/` at `/sync` (`recorder-sync`) | `state.json` (per-file progress) and `status.json` (read by the health check)  |
| `db`      | `/var/lib/postgresql` (`postgres`)                | The PostgreSQL cluster, data in its `data/`                                    |
| `valkey`  | `/data` (`valkey`)                                | Valkey's snapshot, saved every five minutes that have a change and on shutdown |

The location history itself — points, tracks, visits, places, trips, stats — is in PostgreSQL.

`/var/app/public` is not a volume: nothing writes there at runtime, so the image's own assets are always current. `/var/app/tmp` (export and import staging, and the watched-import folder) is ephemeral.

## File Models

One model, `store.json` on the `startos` volume. Dawarich itself has no configuration file: the package configures it entirely through environment variables, set on every start from `store.json` and the service's addresses.

| Key                    | Set by                                          | Notes                                                                        |
| ---------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------- |
| `postgresPassword`     | Install                                         | Internal                                                                     |
| `secretKeyBase`        | Install                                         | Rails' `SECRET_KEY_BASE`; also the key for archived raw data. Never changes. |
| `otp*` (three keys)    | Install                                         | Encryption keys that make two-factor sign-in available. Never change.        |
| `adminEmail`           | Default `admin@dawarich.local`                  | The email the admin account is created with                                  |
| `adminPassword`        | Set Admin Password                              | The last password the package issued                                         |
| `adminPasswordPending` | Set Admin Password, `setup`                     | `true` while an issued password has not reached the database                 |
| `primaryUrl`           | Install (the `.local` address), Set Primary URL | Becomes `DOMAIN`, the host in links inside Dawarich's emails                 |
| `smtp`                 | Configure SMTP                                  | Becomes the `SMTP_*` variables                                               |
| `recorderLinks`        | Link / Unlink OwnTracks Recorder User           | Recorder user → Dawarich account id and email                                |

Variables re-asserted on every start: the database, Valkey and secret variables; `APPLICATION_HOSTS` (see [Network Access and Interfaces](#network-access-and-interfaces)); `APPLICATION_PROTOCOL=http`; `TIME_ZONE=UTC`; `WEB_CONCURRENCY=1`; `BACKGROUND_PROCESSING_CONCURRENCY=3`; `PROMETHEUS_EXPORTER_ENABLED=false`; `DOMAIN`; and the `SMTP_*` set.

**What the package leaves alone:** none of Dawarich's instance-setting variables (`PHOTON_API_HOST`, `GEOAPIFY_API_KEY`, `STORE_GEODATA` and the rest) are set, so every field under **Settings → Instance** stays editable in Dawarich and is stored in its database. Sign-up, users, integrations, map tiles and each user's time zone are likewise Dawarich's own settings.

**Changing the admin account in Dawarich is safe.** The package never re-applies its password on a start; only the Set Admin Password action changes it.

## Dependencies

One optional dependency, declared only while at least one Recorder user is linked.

| Dependency         | Required | Mount                                                                                         | Why                                                                  |
| ------------------ | -------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| OwnTracks Recorder | No       | its `main` volume, subpath `recorder/rec`, at `/recorder`, read-only, in `recorder-sync` only | The per-user, per-device, per-month `.rec` files the Recorder stores |

Only the `rec/` tree is mounted. The Recorder's `store.json`, which holds every MQTT password, is outside it.

**How the sync works.** For each link, `recorder-sync` first uploads each of the user's existing `.rec` files through Dawarich's imports API (`POST /api/v1/imports`) with the linked account's API key, then polls the files every 15 seconds and sends each new location to Dawarich's OwnTracks endpoint (`POST /api/v1/owntracks/points`). Byte offsets per file are saved in `state.json`, so a restart resumes where it stopped; a new month's or new device's file is followed from its start. Only the Recorder's plain location records are sent — the same subset Dawarich's own `.rec` importer takes. Each record gets its `topic` added before it is sent, because the Recorder does not store one for MQTT publishes and Dawarich converts OwnTracks speed from km/h to m/s only when it is present. The API key is read from Dawarich's database at start and re-read on a `401`, so regenerating it in Dawarich does not break the sync. Dawarich ignores a point it already has, so overlapping imports and resends are harmless.

Nothing is sent to the Recorder, and the phones keep talking MQTT to it.

## Network Access and Interfaces

One interface. The web app, every tracker endpoint and the live-update websocket share it.

| Interface | Id   | Type | Port | Protocol |
| --------- | ---- | ---- | ---- | -------- |
| Web UI    | `ui` | ui   | 3000 | HTTP     |

Phone apps use the same address as the browser: OwnTracks posts to `/api/v1/owntracks/points?api_key=…`, Overland to `/api/v1/overland/batches?api_key=…`, and the Dawarich apps to the base URL with an API key. Each user's URLs are on their account page in Dawarich.

**Rails only answers the hostnames it knows.** `APPLICATION_HOSTS` is rebuilt from the interface's addresses on every start (plus `localhost`, `127.0.0.1`, `[::1]` and the bridge address), and the service restarts when an address is added or removed. A request for any other hostname gets `403` with `Blocked hosts` in the log; `/api/v1/health` is exempt.

The map in the browser loads its tiles from `tyles.dwri.xyz`, Dawarich's tile server, unless a user sets another tile URL in their map settings.

## Installation and First-Run Flow

Nothing about the admin account is left to whoever opens the address first.

1. Install generates the database password, `SECRET_KEY_BASE` and the three two-factor keys, and defaults the primary URL to the `.local` address.
2. The critical **Set Admin Password** task blocks the first start. Running it generates the password and shows the login email.
3. The first start runs every migration, then `setup` creates the admin before upstream's `db:seed` runs. `db:seed` creates `demo@dawarich.app` / `safepassword` only when there are no users, so on this package that account never exists. It still loads the country borders, regions and default tags.

The first start takes about a minute on a small x86 server; later starts take under a minute.

## Actions

Five actions. The two Recorder actions sit in an **OwnTracks Recorder** group.

### Set Admin Password

- **When:** first run (its task), or when the admin password is lost.
- **What it changes:** generates a new password, stores it, and sets it on the admin account — the account with the stored email, or the oldest admin if that email was changed in Dawarich. It also unlocks the account if too many failed sign-ins locked it.
- **Cost:** while Dawarich is running, about ten seconds (a temporary Rails process applies it at once, with no restart). While it is stopped, instant; the password is applied at the next start.
- **Repeat safety:** each run replaces the password.
- **Outputs:** the admin's sign-in email and the new password.

### Configure SMTP

- **When:** to let Dawarich send password-reset, family-invitation, 2FA-lockout and digest emails.
- **What it changes:** `smtp` in `store.json`, then the `SMTP_*` variables. Sender, server and credentials come from StartOS's system SMTP or a custom server.
- **Cost:** restarts Dawarich.
- **Repeat safety:** idempotent; the form is pre-filled.

### Set Primary URL

- **When:** to choose the address links in Dawarich's emails point to.
- **What it changes:** `primaryUrl`, then `DOMAIN`.
- **Cost:** restarts Dawarich.
- **Repeat safety:** idempotent.

### Link OwnTracks Recorder User

- **When:** to have a Recorder user's history in a Dawarich account and keep it current.
- **What it changes:** adds or replaces that Recorder user's entry in `recorderLinks`; the dependency is declared.
- **Cost:** restarts Dawarich; the history import then runs in the background, as ordinary Dawarich imports visible on the account's Imports page.
- **Repeat safety:** linking the same Recorder user again replaces its account. Linking it back to an account it was linked to before resumes from the saved offsets. Nothing is duplicated either way.
- **Needs:** Dawarich running (the accounts are read from its database), and at least one Recorder user with a stored location.

### Unlink OwnTracks Recorder User

- **When:** to stop following a Recorder user.
- **What it changes:** removes the entry from `recorderLinks`. Imported locations stay in Dawarich; the saved offsets stay in `state.json`.
- **Cost:** restarts Dawarich.
- **Repeat safety:** idempotent. Only shown while a link exists.

## Tasks

Two tasks, one of them critical.

| Task               | Severity    | Raised when                                                                                 | Cleared when                        |
| ------------------ | ----------- | ------------------------------------------------------------------------------------------- | ----------------------------------- |
| Set Admin Password | `critical`  | No admin password is stored — on install, and on any init that finds none                   | Set Admin Password runs             |
| Set Primary URL    | `important` | SMTP is not disabled and the stored primary URL is no longer one of the service's addresses | Set Primary URL picks a current one |

A service that will not start and offers no Start button is waiting on the admin-password task.

## Health Checks

Three checks are shown, plus one that appears only when something is wrong. The database and Valkey checks are hidden.

| Check                   | Probes                                                                | Grace |
| ----------------------- | --------------------------------------------------------------------- | ----- |
| Web Interface           | Port 3000 is listening — Puma binds only after the app has loaded     | 5 min |
| Background Jobs         | Sidekiq's process registry in Valkey (database 1) is not empty        | 2 min |
| OwnTracks Recorder Sync | `status.json` written by `recorder-sync`; only while a user is linked | 1 min |

- **Web Interface failing past its grace period:** the log shows why — a migration error from `setup`, or Puma failing to boot. `setup` failing stops the chain before `web` starts.
- **Background Jobs failing:** imports stay "created", stats and tracks are not generated, and emails are not sent. Look for Sidekiq's error in the log.
- **OwnTracks Recorder Sync:** `loading` while a history import is being uploaded; `failure` carries the script's error, most often a Dawarich account that was deleted (unlink and relink) or Dawarich not answering. A failing link does not stop the others.
- **OwnTracks Recorder Sync — "not installed":** a link exists but the Recorder is not installed. Install it, or unlink the user.

Four log lines look like faults and are not:

- `relation "flipper_features" does not exist` — the first start only, before migrations create the feature-flag table.
- `database "dawarich" already exists` — every start; upstream's entrypoint tries `createdb` before migrating.
- Valkey's `WARNING Memory overcommit must be enabled!` — a host kernel setting the package cannot change. The package turns off Valkey's `stop-writes-on-bgsave-error`, so a snapshot that fails for lack of memory does not stop Dawarich's jobs.
- `rehash: warning: skipping ca-certificates.crt` — every start, from installing the server's root CA.

## Backups and Restore

The database is dumped, not copied: `sdk.Backups.withPgDump` runs `pg_dump` of the `dawarich` database, and restore creates a fresh cluster and replays the dump. The `startos` and `main` volumes are copied as they are.

- **Included:** the whole location history and every Dawarich setting (database), uploaded import files, exports, posters and videos (`main`), sync progress, and `store.json` with its secrets and credentials.
- **Excluded:** the `valkey` volume. A restored instance starts with an empty job queue and cache, and Dawarich's in-app **sign-up** switch (kept only in that cache) is back to off.
- **After a restore:** nothing to redo. The admin password and the Recorder links come back with `store.json`; the sync resumes from its saved offsets.

## Limitations and Differences

1. **The demo account is never created,** and the admin signs in as `admin@dawarich.local` until changed in Dawarich.
2. **The OwnTracks Recorder sync is one-way and polled:** new locations arrive within about 15 seconds, and deleting tracks in the Recorder does not delete them in Dawarich.
3. **Only locations are synced from the Recorder** — not waypoints, region transitions, cards or friends.
4. **The sign-up switch in Dawarich's user settings does not survive a restore,** because upstream keeps it only in the cache.
5. **No OIDC sign-in, S3 storage, Prometheus metrics or watched-import folder** — none of them is configured by the package.
6. **Map tiles are fetched by the browser from Dawarich's tile server** unless a user sets their own.
7. **No armv7 or riscv64 build.**

---

## Quick Reference for AI Consumers

```yaml
package_id: dawarich
image: freikin/dawarich # plus a built postgres+PostGIS image and valkey/valkey
architectures:
  - x86_64
  - aarch64
subcontainers:
  - postgres
  - valkey
  - dawarich # setup oneshot, web and sidekiq daemons
  - recorder-sync # only while an OwnTracks Recorder user is linked
volumes:
  startos: store.json (host side)
  main: its storage/ at /var/app/storage; its recorder-sync/ at /sync
  db: /var/lib/postgresql
  valkey: /data
file_models:
  - store.json
startos_managed_env_vars:
  - RAILS_ENV
  - SELF_HOSTED
  - DATABASE_HOST
  - DATABASE_PORT
  - DATABASE_USERNAME
  - DATABASE_PASSWORD
  - DATABASE_NAME
  - REDIS_URL
  - SECRET_KEY_BASE
  - OTP_ENCRYPTION_PRIMARY_KEY
  - OTP_ENCRYPTION_DETERMINISTIC_KEY
  - OTP_ENCRYPTION_KEY_DERIVATION_SALT
  - APPLICATION_HOSTS
  - APPLICATION_PROTOCOL
  - TIME_ZONE
  - WEB_CONCURRENCY
  - BACKGROUND_PROCESSING_CONCURRENCY
  - PROMETHEUS_EXPORTER_ENABLED
  - DOMAIN
  - SMTP_SERVER # and the rest of SMTP_*, only when SMTP is configured
dependencies:
  - owntracks-recorder # optional; declared only while a user is linked
interfaces:
  ui: { type: ui, port: 3000 }
actions:
  - set-admin-password
  - configure-smtp
  - set-primary-url
  - link-recorder-user
  - unlink-recorder-user # hidden until a user is linked
tasks:
  - { action: set-admin-password, severity: critical }
  - { action: set-primary-url, severity: important }
health_checks:
  - web
  - sidekiq
  - recorder-sync # only while a user is linked
  - recorder-missing # only while a user is linked and the Recorder is not installed
```
