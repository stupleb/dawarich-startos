<p align="center">
  <img src="icon.svg" alt="Dawarich Logo" width="21%">
</p>

# Dawarich on StartOS

> Everything not listed in this document should behave the same as upstream
> Dawarich. If a feature, setting, or behavior is not mentioned here, the
> upstream documentation is accurate and fully applicable — see the
> Documentation section of `instructions.md` for links.

[Dawarich](https://github.com/Freika/dawarich) keeps a location history — from phone apps, from imported Google Takeout and other files — and shows it as a map, timeline, visits, trips and statistics. This package runs it with its database and job queue, creates the admin account itself so the upstream demo account never exists, can mirror the users of the OwnTracks Recorder package into Dawarich accounts, and can connect Dawarich accounts to their Immich photos.

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

- **`setup`** installs this server's root CA into the container's trust store, runs `rails db:migrate`, and runs `assets/admin.rb` under `rails runner` — which creates the admin account on an empty database, and applies an email and password the Set Admin Password action could not apply itself.
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

`/var/app/public` is not a volume: upstream's web entrypoint refreshes it from the image on every start. `/var/app/tmp` (export and import staging, and the watched-import folder) is ephemeral.

## File Models

One model, `store.json` on the `startos` volume. Dawarich itself has no configuration file: the package configures it entirely through environment variables, set on every start from `store.json` and the service's addresses.

| Key                    | Set by                                | Notes                                                                        |
| ---------------------- | ------------------------------------- | ---------------------------------------------------------------------------- |
| `postgresPassword`     | Install                               | Internal                                                                     |
| `secretKeyBase`        | Install                               | Rails' `SECRET_KEY_BASE`; also the key for archived raw data. Never changes. |
| `otp*` (three keys)    | Install                               | Encryption keys that make two-factor sign-in available. Never change.        |
| `adminEmail`           | Set Admin Password                    | The admin's sign-in email as the package last set it                         |
| `adminPassword`        | Set Admin Password                    | The last password the package issued                                         |
| `adminPasswordPending` | Set Admin Password, `setup`           | `true` while an issued password has not reached the database                 |
| `primaryUrl`           | Set Primary URL                       | The address chosen for email links; unset until the action runs              |
| `smtp`                 | Configure SMTP                        | Becomes the `SMTP_*` variables                                               |
| `recorderLinks`        | Link / Unlink OwnTracks Recorder User | Recorder user → Dawarich account id and email                                |
| `immichConnections`    | Connect / Disconnect Immich           | Dawarich account id and email → Immich account id and the id of its key      |

Variables re-asserted on every start: the database, Valkey and secret variables; `APPLICATION_HOSTS` (see [Network Access and Interfaces](#network-access-and-interfaces)); `APPLICATION_PROTOCOL=http`; `TIME_ZONE=UTC`; `WEB_CONCURRENCY=1`; `BACKGROUND_PROCESSING_CONCURRENCY=3`; `PROMETHEUS_EXPORTER_ENABLED=false`; the `SMTP_*` set; and `DOMAIN`, the host and port of the address email links use. That is `primaryUrl` followed to its hostname's current port; while it is unset or no longer one of the interface's addresses, a public domain if there is one, else the `.local` address. Only HTTPS addresses qualify, because Dawarich writes `https://` into every email link. Dawarich restarts when that address changes.

**What the package leaves alone:** none of Dawarich's instance-setting variables (`PHOTON_API_HOST`, `GEOAPIFY_API_KEY`, `STORE_GEODATA` and the rest) are set, so every field under **Settings → Instance** stays editable in Dawarich and is stored in its database. Sign-up, users, integrations, map tiles and each user's time zone are likewise Dawarich's own settings; Connect Immich writes one account's Immich settings through the same code Dawarich's Integrations page uses.

**Changing the admin account in Dawarich is safe.** The package never re-applies its password on a start; only the Set Admin Password action changes it.

## Dependencies

Two optional dependencies. OwnTracks Recorder is enabled only while at least one Recorder user is linked; StartOS then expects it running with its **MQTT Broker** (`mosquitto`) and **Recorder** (`recorder`) checks passing. Immich is enabled only while at least one account is connected; StartOS then expects it running. Either one shows a warning on Dawarich's page when it isn't, and never stops Dawarich from starting.

| Dependency         | Required                                           | Mount                                                                                         | Why                                                                                                            |
| ------------------ | -------------------------------------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| OwnTracks Recorder | No; expected running while a user is linked        | its `main` volume, subpath `recorder/rec`, at `/recorder`, read-only, in `recorder-sync` only | The per-user, per-device, per-month `.rec` files the Recorder stores                                           |
| Immich `>=3.3.1:2` | No; expected running while an account is connected | none                                                                                          | Its hidden `list-users`, `create-api-key` and `delete-api-key` actions, and its web port on the StartOS bridge |

Only the `rec/` tree is mounted. The Recorder's `store.json`, which holds every MQTT password, is outside it.

**How the sync works.** For each link, `recorder-sync` first uploads each of the user's `.rec` files through Dawarich's imports API (`POST /api/v1/imports`) with the linked account's API key, and counts a file done only once Dawarich reports that import completed (`GET /api/v1/imports/<id>`). An import Dawarich marks failed is reported by the sync check and uploaded again at the next start. After that, it polls the files every 15 seconds and sends each new location to Dawarich's OwnTracks endpoint (`POST /api/v1/owntracks/points`), which stores it before answering. Byte offsets per file are saved in `state.json`, so a restart resumes where it stopped; a new month's or new device's file is followed from its start. Only the Recorder's plain location records are sent — the same subset Dawarich's own `.rec` importer takes. Each record gets its `topic` added before it is sent, because the Recorder does not store one for MQTT publishes and Dawarich converts OwnTracks speed from km/h to m/s only when it is present. The API key is read from Dawarich's database at start and re-read on a `401`, so regenerating it in Dawarich does not break the sync. Dawarich ignores a point it already has, so overlapping imports and resends are harmless.

Nothing is sent to the Recorder, and the phones keep talking MQTT to it.

**How the Immich connection works.** Immich's actions answer only a package that declares Immich as a dependency, so Connect Immich declares it for the call; once an account is connected, `immichConnections` keeps it declared. Connect lists Immich's accounts and takes the one whose email matches the Dawarich account's, ignoring case, then has Immich create an API key named `Dawarich` in it with `asset.read` and `asset.view`, plus `asset.update` when **Add locations to photos** is on. `assets/immich.rb` then runs under `rails runner`: Dawarich's own Immich connection test, and on success the settings update behind Dawarich's Integrations page, which records the connection status and clears the account's photo cache. The address it saves is Immich's web port on the StartOS bridge (`http://10.0.3.1:<port>`), plain HTTP with no certificate to trust; the port survives Immich updates. A failed connect deletes the key it created and leaves the account's previous settings in place; a successful one deletes the key it replaced. Disconnect deletes the key in Immich, then clears the account's Immich address and key in Dawarich.

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

1. Install generates the database password, `SECRET_KEY_BASE` and the three two-factor keys. No primary URL is stored; email links use the fallback address until Set Primary URL runs.
2. The critical **Set Admin Password** task blocks the first start. It asks for the email the admin will sign in with, generates the password, and shows both.
3. The first start runs every migration, then `setup` creates the admin with that email before upstream's `db:seed` runs. `db:seed` creates `demo@dawarich.app` / `safepassword` only when there are no users, so on this package that account never exists. It still loads the country borders, regions and default tags.

The first start takes about a minute on a small x86 server; later starts take under a minute.

## Actions

Seven actions. The two Recorder actions sit in an **OwnTracks Recorder** group and stay hidden until OwnTracks Recorder is installed; Unlink also needs a linked user. The two Immich actions sit in an **Immich** group: Connect is hidden until Immich is installed and disabled while it is older than 3.3.1:2, and Disconnect needs a connected account.

### Set Admin Password

- **When:** first run (its task), when the admin password is lost, or to change the admin's sign-in email.
- **Input:** the email. On later runs it is pre-filled with the admin's current email, read from Dawarich's database while it is running.
- **What it changes:** generates a new password and sets it, with the email, on the package's admin account — the oldest account with admin rights. A different email renames that account. It also unlocks the account if too many failed sign-ins locked it.
- **Refuses** an email that another Dawarich account already uses, and changes nothing. If that clash only shows up at the next start (the password was set while Dawarich was stopped), the password is applied and the account keeps its current email.
- **Cost:** while Dawarich is running, about ten seconds (a temporary Rails process applies it at once, with no restart). While it is stopped, instant; the password is applied at the next start.
- **Repeat safety:** each run replaces the password.
- **Outputs:** the admin's sign-in email and the new password.

### Configure SMTP

- **When:** to let Dawarich send password-reset, family-invitation, 2FA-lockout and digest emails.
- **What it changes:** `smtp` in `store.json`, then the `SMTP_*` variables. Sender, server and credentials come from StartOS's system SMTP or a custom server.
- **Cost:** restarts Dawarich.
- **Repeat safety:** idempotent; the form is pre-filled.

### Set Primary URL

- **When:** to choose the address links in Dawarich's emails point to. Not needed while the fallback address suits.
- **What it changes:** `primaryUrl`, then `DOMAIN`. Only HTTPS addresses are offered.
- **Cost:** restarts Dawarich.
- **Repeat safety:** idempotent.

### Link OwnTracks Recorder User

- **When:** to have a Recorder user's history in a Dawarich account and keep it current.
- **What it changes:** adds or replaces that Recorder user's entry in `recorderLinks`, which enables the dependency. Refuses a Recorder user with no stored locations.
- **Cost:** restarts Dawarich; the history import then runs in the background, as ordinary Dawarich imports visible on the account's Imports page.
- **Repeat safety:** linking the same Recorder user again replaces its account. Linking it back to an account it was linked to before resumes from the saved offsets. Nothing is duplicated either way.
- **Needs:** Dawarich running (the accounts are read from its database), and at least one Recorder user with a stored location.

### Unlink OwnTracks Recorder User

- **When:** to stop following a Recorder user.
- **What it changes:** removes the entry from `recorderLinks`. Imported locations stay in Dawarich; the saved offsets stay in `state.json`.
- **Cost:** restarts Dawarich.
- **Repeat safety:** idempotent. Only shown while a link exists.

### Connect Immich

- **When:** to show a person's Immich photos on their Dawarich map, or to change whether Dawarich may add locations to them.
- **Input:** the Dawarich account (no default), and **Add locations to photos** (off by default), which lets Dawarich's Enrich feature write positions into that person's Immich photos that have none.
- **What it changes:** creates an Immich API key named `Dawarich` in the Immich account with the same email, saves Immich's bridge address and that key as the Dawarich account's Immich settings, and records the pair in `immichConnections`.
- **Refuses** a Dawarich account whose email no Immich account uses (naming that email), and refuses while Immich is stopped. Neither email is verified by either app: the match only means the same address was entered in both.
- **Cost:** about ten seconds (a temporary Rails process), no restart.
- **Repeat safety:** connecting the account again replaces its key and deletes the old one.
- **Needs:** Dawarich and Immich running, Immich 3.3.1:2 or later.
- **Outputs:** both accounts' emails and the access granted.

### Disconnect Immich

- **When:** to stop Dawarich reading a person's Immich photos.
- **What it changes:** deletes the account's `Dawarich` key in Immich, clears the account's Immich address and key in Dawarich, and removes the pair from `immichConnections`.
- **Refuses** while Immich is installed but stopped, so the key is never left behind. With Immich uninstalled, it only clears Dawarich's side.
- **Repeat safety:** a key already deleted in Immich counts as deleted. Only shown while an account is connected.

## Tasks

One task, and it is critical.

| Task               | Severity   | Raised when                                                               | Cleared when            |
| ------------------ | ---------- | ------------------------------------------------------------------------- | ----------------------- |
| Set Admin Password | `critical` | No admin password is stored — on install, and on any init that finds none | Set Admin Password runs |

A service that will not start and offers no Start button is waiting on the admin-password task. A lost primary URL raises nothing: email links move to the fallback address on their own.

## Health Checks

Three checks are shown, plus one that appears only when something is wrong. The database and Valkey checks are hidden.

| Check                   | Probes                                                                                               | Grace |
| ----------------------- | ---------------------------------------------------------------------------------------------------- | ----- |
| Web Interface           | Port 3000 is listening — Puma binds only after the app has loaded                                    | 5 min |
| Background Jobs         | Sidekiq's process registry in Valkey (database 1) is not empty                                       | 2 min |
| OwnTracks Recorder Sync | The Recorder's run state, then `status.json` written by `recorder-sync`; only while a user is linked | 1 min |

- **Web Interface failing past its grace period:** the log shows why — a migration error from `setup`, or Puma failing to boot. `setup` failing stops the chain before `web` starts.
- **Background Jobs failing:** imports stay "created", stats and tracks are not generated, and emails are not sent. Look for Sidekiq's error in the log.
- **OwnTracks Recorder Sync, healthy:** names each linked Recorder user with the date of the newest location the Recorder holds for them. A date that stops moving means that phone is no longer reaching the Recorder — check the phone's OwnTracks connection settings and the Recorder's log, not Dawarich.
- **OwnTracks Recorder Sync, `loading`:** "Paused" while OwnTracks Recorder is stopped (start it; whatever it records after it starts is forwarded then), or "Importing" until Dawarich has finished the history imports.
- **OwnTracks Recorder Sync, `failure`:** names the Recorder user and the problem. A deleted Dawarich account: unlink and link again. An import Dawarich could not process: its reason is shown and on the account's Imports page; restart Dawarich to upload it again. Anything else carries the script's error. A failing link does not stop the others.
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
- **After a restore:** nothing to redo. The admin password, the Recorder links and the Immich connections come back with `store.json`; the sync resumes from its saved offsets, and `DOMAIN` follows the chosen address to its new port. If Immich was restored from a backup older than a connection, run Connect Immich again for that account.

## Limitations and Differences

What the package leaves out or does differently from upstream's Docker setup.

1. **The demo account is never created.** The admin account is created with the email given to Set Admin Password.
2. **The OwnTracks Recorder sync is one-way and polled,** so deleting tracks in the Recorder does not delete them in Dawarich.
3. **Only locations are synced from the Recorder** — not waypoints, region transitions, cards or friends.
4. **No OIDC sign-in, S3 storage, Prometheus metrics or watched-import folder** — none of them is configured by the package.
5. **Connect Immich matches accounts by email only.** A person whose emails differ between the two apps can still connect on Dawarich's Integrations page, with a key they create in Immich and Immich's LAN IP address including its port: `.local` names don't resolve inside StartOS's containers.
6. **No armv7 or riscv64 build.**

---

## Quick Reference for AI Consumers

The package's operable surface in one block; each key mirrors a section above.

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
  - owntracks-recorder # optional; enabled while a user is linked, then expected running
  - immich # optional; enabled while an account is connected, then expected running
interfaces:
  ui: { type: ui, port: 3000 }
actions:
  - set-admin-password
  - configure-smtp
  - set-primary-url
  - link-recorder-user # hidden until OwnTracks Recorder is installed
  - unlink-recorder-user # hidden until a user is linked
  - connect-immich # hidden until Immich is installed; disabled below Immich 3.3.1:2
  - disconnect-immich # hidden until an account is connected
tasks:
  - { action: set-admin-password, severity: critical }
health_checks:
  - web
  - sidekiq
  - recorder-sync # only while a user is linked
  - recorder-missing # only while a user is linked and the Recorder is not installed
```
