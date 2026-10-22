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

Three images run as five processes. The Dawarich image is upstream's with its CA store upgraded by `dawarich/Dockerfile`, a temporary layer that comes out once upstream ships an image built on a fixed store; the database image is built by this package, because upstream's PostGIS image is published for x86_64 only.

| Image      | Source                                                                                            | Architectures   |
| ---------- | ------------------------------------------------------------------------------------------------- | --------------- |
| `dawarich` | `dawarich/Dockerfile`: `freikin/dawarich` with Debian's current `ca-certificates`                 | x86_64, aarch64 |
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

| Key                    | Set by                                                      | Notes                                                                                                                                                                                                                                  |
| ---------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `postgresPassword`     | Install                                                     | Internal                                                                                                                                                                                                                               |
| `secretKeyBase`        | Install                                                     | Rails' `SECRET_KEY_BASE`; also the key for archived raw data. Never changes.                                                                                                                                                           |
| `otp*` (three keys)    | Install                                                     | Encryption keys that make two-factor sign-in available. Never change.                                                                                                                                                                  |
| `adminEmail`           | Set Admin Password                                          | The admin's sign-in email as the package last set it                                                                                                                                                                                   |
| `adminPassword`        | Set Admin Password                                          | The last password the package issued                                                                                                                                                                                                   |
| `adminPasswordPending` | Set Admin Password, `setup`                                 | `true` while an issued password has not reached the database                                                                                                                                                                           |
| `primaryUrl`           | Set Primary URL                                             | The address chosen for email links; unset until the action runs                                                                                                                                                                        |
| `smtp`                 | Configure SMTP                                              | Becomes the `SMTP_*` variables                                                                                                                                                                                                         |
| `recorderLinks`        | Link / Unlink OwnTracks Recorder User                       | Recorder user → Dawarich account id and email                                                                                                                                                                                          |
| `airtrailConnections`  | Connect / Confirm / Disconnect AirTrail, the AirTrail check | Dawarich account id and email → the AirTrail username expected, the approved account's id, the key in use and the key awaiting approval (secret and SHA-256), an approved account held for confirmation, and why a request was dropped |
| `photonHost`           | Connect / Disconnect Photon, `photon-host`                  | The Photon host the package last wrote to Dawarich's instance settings; null while not connected                                                                                                                                       |
| `immichConnections`    | Connect / Disconnect Immich, the Immich check               | Dawarich account id and email → the key in use and the key awaiting approval (each its secret, the secret's SHA-256, and whether it may add locations), and why a request was dropped                                                  |

Variables re-asserted on every start: the database, Valkey and secret variables; `APPLICATION_HOSTS` (see [Network Access and Interfaces](#network-access-and-interfaces)); `APPLICATION_PROTOCOL=http`; `TIME_ZONE=UTC`; `WEB_CONCURRENCY=1`; `BACKGROUND_PROCESSING_CONCURRENCY=3`; `PROMETHEUS_EXPORTER_ENABLED=false`; the `SMTP_*` set; and `DOMAIN`, the host and port of the address email links use. That is `primaryUrl` followed to its hostname's current port; while it is unset or no longer one of the interface's addresses, a public domain if there is one, else the `.local` address. Only HTTPS addresses qualify, because Dawarich writes `https://` into every email link. Dawarich restarts when that address changes.

**What the package leaves alone:** none of Dawarich's instance-setting variables (`PHOTON_API_HOST`, `GEOAPIFY_API_KEY`, `STORE_GEODATA` and the rest) are set, so every field under **Settings → Instance** stays editable in Dawarich and is stored in its database. Sign-up, users, integrations, map tiles and each user's time zone are likewise Dawarich's own settings; once Immich approves a connection, the package writes that account's Immich settings through the same code Dawarich's Integrations page uses, the same goes for AirTrail once its connection is approved, and Connect Photon writes the Photon settings through the code behind **Settings → Instance**.

**Changing the admin account in Dawarich is safe.** The package never re-applies its password on a start; only the Set Admin Password action changes it.

## Dependencies

Four optional dependencies. OwnTracks Recorder is enabled only while at least one Recorder user is linked; StartOS then expects it running with its **MQTT Broker** (`mosquitto`) and **Recorder** (`recorder`) checks passing. Immich is enabled only while at least one account is connected or waiting for approval; StartOS then expects it running. AirTrail is enabled only while at least one account is connected, waiting or held; StartOS then expects it running with its **AirTrail** (`airtrail`) check passing. Photon is enabled only while connected; StartOS then expects it running with its **Photon** (`photon`) check passing. Its `data` check is left out, because it reports loading during routine rebuilds while the API keeps answering. Each one shows a warning on Dawarich's page when it isn't, and never stops Dawarich from starting.

| Dependency            | Required                                                      | Mount                                                                                         | Why                                                                                             |
| --------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| OwnTracks Recorder    | No; expected running while a user is linked                   | its `main` volume, subpath `recorder/rec`, at `/recorder`, read-only, in `recorder-sync` only | The per-user, per-device, per-month `.rec` files the Recorder stores                            |
| AirTrail `>=3.13.0:0` | No; expected running while an account is connected            | none                                                                                          | Its hidden `request-access` and `revoke-access` actions, and its web port on the StartOS bridge |
| Photon `>=1.3.0:0`    | No; expected running while connected                          | none                                                                                          | Its API port on the StartOS bridge                                                              |
| Immich `>=3.3.3:1`    | No; expected running while an account is connected or waiting | none                                                                                          | Its hidden `request-access` and `revoke-access` actions, and its web port on the StartOS bridge |

Only the `rec/` tree is mounted. The Recorder's `store.json`, which holds every MQTT password, is outside it.

**How the sync works.** For each link, `recorder-sync` first uploads each of the user's `.rec` files through Dawarich's imports API (`POST /api/v1/imports`) with the linked account's API key, and counts a file done only once Dawarich reports that import completed (`GET /api/v1/imports/<id>`). An import Dawarich marks failed is reported by the sync check and uploaded again at the next start. After that, it polls the files every 15 seconds and sends each new location to Dawarich's OwnTracks endpoint (`POST /api/v1/owntracks/points`), which stores it before answering. Byte offsets per file are saved in `state.json`, so a restart resumes where it stopped; a new month's or new device's file is followed from its start. Only the Recorder's plain location records are sent — the same subset Dawarich's own `.rec` importer takes. Each record gets its `topic` added before it is sent, because the Recorder does not store one for MQTT publishes and Dawarich converts OwnTracks speed from km/h to m/s only when it is present. The API key is read from Dawarich's database at start and re-read on a `401`, so regenerating it in Dawarich does not break the sync. Dawarich ignores a point it already has, so overlapping imports and resends are harmless.

Nothing is sent to the Recorder, and the phones keep talking MQTT to it.

**How the AirTrail connection works.** It follows the Immich connection: Connect AirTrail declares the dependency for the call, generates a key, stores it as the account's pending key, withdraws the account's earlier waiting request, and sends AirTrail only the key's SHA-256 through `request-access`, asking for `flight.read.own` and `profile.read`, labelled "<Dawarich email> → <expected username>". AirTrail raises its own task, where the user approves the request with an AirTrail account or denies it; an approved key appears under that account's AirTrail security settings as `StartOS: dawarich`. The **AirTrail** health check calls AirTrail's `GET /api/v1/me` with the key every 15 seconds: `401` means not approved, and a `200` names the account. AirTrail accounts have no email and their usernames can change, so the person's AirTrail username is entered at Connect. When the approved account has that username, ignoring case, `assets/airtrail.rb` runs under `rails runner`: Dawarich's own AirTrail connection test, the settings update behind Dawarich's Integrations page, and a first flight import. The key goes into use, the key it replaces is revoked, and the account's AirTrail `id` is recorded, so renaming it later changes nothing. When the approved account has another username, nothing is saved or imported: the account is held, Dawarich raises an important task, and **Confirm AirTrail Account** either adopts the key or revokes it. The address saved is AirTrail's web port on the StartOS bridge (`http://10.0.3.1:<port>`), plain HTTP; Dawarich only sends GET requests with the key there, which AirTrail's HTTPS-only sign-in check does not cover. Dawarich imports only flights where the chosen account is a passenger (`scope=mine`), daily at 02:00 and on **Sync AirTrail flights**. Disconnect revokes the account's keys and clears its AirTrail settings; uninstalling Dawarich revokes all of its keys if AirTrail is running.

**How the Photon connection works.** Connect Photon reads Photon's API port on the StartOS bridge (`10.0.3.1:<port>`, plain HTTP) and runs `assets/photon.rb` under `rails runner`, which writes Dawarich's instance settings `photon_api_host` (that host) and `photon_api_use_https` (off) through the code behind **Settings → Instance**, so they show there and stay editable. Dawarich adds the `/reverse` path itself and sends no API key while that field is empty; Photon needs none. Dawarich's running processes pick up the change without a restart. `photonHost` records the host, which declares the dependency. While connected, `main` watches the bridge address, and the `photon-host` oneshot rewrites the setting if Photon's port changes. Disconnect clears `photon_api_host`, so Dawarich has no lookup provider. Both the rewrite and Disconnect leave the setting alone when it no longer holds the host the package wrote, because the admin changed it, and the package then stops managing it.

Addresses come from Dawarich's own jobs. Points from the phone apps and the Recorder sync are geocoded by a job queued shortly after they arrive. Every point never geocoded is picked up by the nightly job at 01:15. A point outside Photon's countries is marked geocoded with no address and is not retried; **Settings → Background Jobs → Start reverse geocoding** redoes all of them. A point that arrives while Photon is unreachable stays ungeocoded and is retried by the nightly job. Dawarich's **Test connection** button looks up a fixed point in Leipzig and reports "no results" unless Photon serves Germany.

**How the Immich connection works.** Immich's dependent actions answer only a package that declares Immich as a dependency, so Connect Immich declares it for the call; while any account is in `immichConnections`, it stays declared. Connect generates a key, stores it as the account's pending key, and sends Immich only its SHA-256 through `request-access`, asking for `asset.read`, `asset.view` and `user.read`, plus `asset.update` when **Add locations to photos** is on. When Immich's form takes a label, the Dawarich account's email goes with it, cut to 64 characters. It first withdraws the account's earlier request if one is still waiting. Immich raises its own task, where the user approves the request with an Immich account or denies it; an approved key appears in that account's API keys as `StartOS: dawarich`. Dawarich learns the outcome by using the key: the **Immich** health check calls Immich's `GET /api/users/me` with it every 15 seconds. A `401` means not approved, and a waiting request looks the same as a denied one. A `200` names the approved account. When its email matches the Dawarich account's, ignoring case, `assets/immich.rb` runs under `rails runner`: Dawarich's own Immich connection test, and on success the settings update behind Dawarich's Integrations page, which records the connection status and clears the account's photo cache. The key then goes into use and the key it replaces is revoked. A key approved for another person's account, or one Dawarich's connection test rejects, is revoked at once and the check reports why. The address saved is Immich's web port on the StartOS bridge (`http://10.0.3.1:<port>`), plain HTTP with no certificate to trust; the port survives Immich updates. Disconnect revokes the account's keys through `revoke-access`, then clears the account's Immich address and key in Dawarich. Uninstalling Dawarich revokes all of its keys if Immich is running; otherwise Immich drops them when it next starts.

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

Twelve actions. The two Recorder actions sit in an **OwnTracks Recorder** group and stay hidden until OwnTracks Recorder is installed; Unlink also needs a linked user. The two Immich actions sit in an **Immich** group: Connect is hidden until Immich is installed and disabled while it is older than 3.3.3:1, and Disconnect needs an account that is connected or waiting for approval. The three AirTrail actions sit in an **AirTrail** group: Connect is hidden until AirTrail is installed, Confirm appears only while an approved account is held, and Disconnect needs an account that is connected, waiting or held. The two Photon actions sit in a **Photon** group: Connect is hidden until Photon is installed, and Disconnect needs a connection.

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

- **When:** to show a person's Immich photos on their Dawarich map, to change whether Dawarich may add locations to them, or to ask again after a request was denied or approved with the wrong account.
- **Input:** the Dawarich account (no default), and **Add locations to photos** (off by default), which lets Dawarich's Enrich feature write positions into that person's Immich photos that have none.
- **What it changes:** generates a key, records it as the account's pending key in `immichConnections`, and asks Immich for access with it. Immich raises a task, which names the Dawarich account's email when the installed Immich takes a label. Once the user approves it with the Immich account that has the same email, the Immich health check puts the key into use within 15 seconds. A key already in use keeps working until then.
- **Refuses** while Immich is stopped, and refuses **Add locations to photos** when the installed Immich doesn't offer `asset.update`. Neither email is verified by either app: the match only means the same address was entered in both.
- **Cost:** a few seconds, no restart. Putting the key into use later takes about ten seconds more (a temporary Rails process).
- **Repeat safety:** each run withdraws the account's waiting request and makes a new one. Immich deletes the key a newly approved one replaces.
- **Needs:** Dawarich and Immich running, Immich 3.3.3:1 or later.
- **Outputs:** the email of the Immich account to approve the request with.

### Disconnect Immich

- **When:** to stop Dawarich reading a person's Immich photos, or to drop a request you denied in Immich.
- **What it changes:** revokes the account's keys in Immich, in use or waiting, clears the account's Immich address and key in Dawarich, and removes the account from `immichConnections`.
- **Refuses** while Immich is installed but stopped, so no key is left behind. With Immich uninstalled, it only clears Dawarich's side.
- **Repeat safety:** revoking a key Immich no longer has succeeds. Only shown while an account is connected or waiting for approval.

### Connect AirTrail

- **When:** to import a person's AirTrail flights into their Dawarich account, or to ask again after a request was denied.
- **Input:** the Dawarich account (no default) and the person's current AirTrail username.
- **What it changes:** generates a key, records it as the account's pending key in `airtrailConnections` with the username, and asks AirTrail for access with it. Once the user approves it in AirTrail's task, the AirTrail health check puts the key into use within 15 seconds if the approved account has that username, or holds it for Confirm AirTrail Account if not.
- **Refuses** while AirTrail is stopped.
- **Cost:** a few seconds, no restart. Putting the key into use later takes about ten seconds more (a temporary Rails process).
- **Repeat safety:** each run withdraws the account's waiting or held request and makes a new one. AirTrail deletes the key a newly approved one replaces.
- **Outputs:** the AirTrail account to approve the request with.

### Confirm AirTrail Account

- **When:** its task asks, because AirTrail approved an account other than the username Connect AirTrail was given.
- **Input:** the Dawarich account, listed with the approved AirTrail username and display name, and **Use this AirTrail account** or **Refuse it and revoke the key**.
- **What it changes:** Use puts the key into use for that account and starts the import; Refuse revokes the key in AirTrail. Either way the task clears. Nothing is imported until one is chosen.
- **Refuses** while AirTrail is stopped, and when AirTrail no longer accepts the held key.

### Disconnect AirTrail

- **When:** to stop importing a person's AirTrail flights, or to drop a request you denied in AirTrail.
- **What it changes:** revokes the account's keys in AirTrail, in use, waiting or held, clears the account's AirTrail address and key in Dawarich, and removes the account from `airtrailConnections`. Flights already imported stay.
- **Refuses** while AirTrail is installed but stopped. With AirTrail uninstalled, it only clears Dawarich's side.

### Connect Photon

- **When:** to have Dawarich look up addresses with the Photon service on this server, or to take the setting back after changing it by hand.
- **What it changes:** writes Photon's bridge address and HTTPS off to Dawarich's Photon instance settings, replacing whatever lookup provider was set there, and records it in `photonHost`, which enables the dependency.
- **Refuses** when Photon has no bridge address.
- **Cost:** about ten seconds (a temporary Rails process), no restart.
- **Repeat safety:** each run writes the current address again.
- **Needs:** Dawarich running and Photon installed.

### Disconnect Photon

- **When:** to stop using Photon for address lookups.
- **What it changes:** clears Dawarich's Photon host, unless the admin has changed it since the package wrote it, and clears `photonHost`, which disables the dependency. Addresses already found stay.
- **Repeat safety:** only shown while connected.

## Tasks

One task, and it is critical.

| Task               | Severity   | Raised when                                                               | Cleared when            |
| ------------------ | ---------- | ------------------------------------------------------------------------- | ----------------------- |
| Set Admin Password | `critical` | No admin password is stored — on install, and on any init that finds none | Set Admin Password runs |

A service that will not start and offers no Start button is waiting on the admin-password task. A lost primary URL raises nothing: email links move to the fallback address on their own.

## Health Checks

Three checks are shown, plus Immich and AirTrail while each is installed and one that appears only when something is wrong. The database and Valkey checks are hidden.

| Check                   | Probes                                                                                                                                                                     | Grace |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| Web Interface           | Port 3000 is listening — Puma binds only after the app has loaded                                                                                                          | 5 min |
| Background Jobs         | Sidekiq's process registry in Valkey (database 1) is not empty                                                                                                             | 2 min |
| OwnTracks Recorder Sync | The Recorder's run state, then `status.json` written by `recorder-sync`; only while a user is linked                                                                       | 1 min |
| Immich                  | Each account's key against Immich's `GET /api/users/me` every 15 seconds, putting approved keys into use; only while Immich is installed                                   | 10 s  |
| AirTrail                | Each account's key against AirTrail's `GET /api/v1/me` every 15 seconds, putting approved keys into use or holding them for confirmation; only while AirTrail is installed | 10 s  |

- **Web Interface failing past its grace period:** the log shows why — a migration error from `setup`, or Puma failing to boot. `setup` failing stops the chain before `web` starts.
- **Background Jobs failing:** imports stay "created", stats and tracks are not generated, and emails are not sent. Look for Sidekiq's error in the log.
- **OwnTracks Recorder Sync, healthy:** names each linked Recorder user with the date of the newest location the Recorder holds for them. A date that stops moving means that phone is no longer reaching the Recorder — check the phone's OwnTracks connection settings and the Recorder's log, not Dawarich.
- **OwnTracks Recorder Sync, `loading`:** "Paused" while OwnTracks Recorder is stopped (start it; whatever it records after it starts is forwarded then), "Waiting for the first sync" until the sync has passed over each linked user once, or "Importing" until Dawarich has finished the history imports.
- **OwnTracks Recorder Sync, `failure`:** names the Recorder user and the problem. A deleted Dawarich account: unlink and link again. An import Dawarich could not process: its reason is shown and on the account's Imports page; restart Dawarich to upload it again. Anything else carries the script's error. A failing link does not stop the others.
- **OwnTracks Recorder Sync — "not installed":** a link exists but the Recorder is not installed. Install it, or unlink the user.
- **Immich, healthy:** lists the connected accounts. `disabled` means no account is connected or waiting.
- **Immich, `loading`:** names each account whose request Immich has not approved. Immich answers a denied request the same way, so the message offers both ways out: approve it in Immich's tasks, or after a denial run Disconnect Immich to stop asking or Connect Immich to ask again. Also "Paused" while Immich is stopped, and "Waiting for Immich to answer" while it starts.
- **Immich, `failure`:** names the account and the problem: the request was approved with another person's Immich account, Dawarich's connection test failed (its reason is shown), or Immich no longer accepts the key, because it or its account was deleted in Immich or another of Dawarich's requests was approved with the same Immich account. Run Connect Immich again for any of these. A deleted Dawarich account shows here too: run Disconnect Immich for it.
- **AirTrail, healthy:** lists each connected Dawarich email with the AirTrail username it imports from, as AirTrail reports it now. `disabled` means no account is connected or waiting.
- **AirTrail, `loading`:** names each request AirTrail has not approved (a denied request looks the same: Disconnect AirTrail to stop asking, or Connect AirTrail to ask again), and each approved account held for Confirm AirTrail Account. Also "Paused" while AirTrail is stopped.
- **AirTrail, `failure`:** a deleted Dawarich account, Dawarich's connection test failing, or AirTrail no longer accepting the key, because it or its account was deleted in AirTrail or another request was approved with the same account. Run Connect AirTrail again, or Disconnect AirTrail for a deleted account.

Four log lines look like faults and are not:

- `relation "flipper_features" does not exist` — the first start only, before migrations create the feature-flag table.
- `database "dawarich" already exists` — every start; upstream's entrypoint tries `createdb` before migrating.
- Valkey's `WARNING Memory overcommit must be enabled!` — a host kernel setting the package cannot change. The package turns off Valkey's `stop-writes-on-bgsave-error`, so a snapshot that fails for lack of memory does not stop Dawarich's jobs.
- `rehash: warning: skipping ca-certificates.crt` — every start, from installing the server's root CA.

## Backups and Restore

The database is dumped, not copied: `sdk.Backups.withPgDump` runs `pg_dump` of the `dawarich` database, and restore creates a fresh cluster and replays the dump. The `startos` and `main` volumes are copied as they are.

- **Included:** the whole location history and every Dawarich setting (database), uploaded import files, exports, posters and videos (`main`), sync progress, and `store.json` with its secrets and credentials.
- **Excluded:** the `valkey` volume. A restored instance starts with an empty job queue and cache, and Dawarich's in-app **sign-up** switch (kept only in that cache) is back to off.
- **After a restore:** nothing to redo. The admin password, the Recorder links and the Immich connections come back with `store.json`; the sync resumes from its saved offsets, and `DOMAIN` follows the chosen address to its new port. If Immich was restored from a backup older than a connection, the Immich check reports that account's key as no longer accepted; run Connect Immich again for it.

## Limitations and Differences

What the package leaves out or does differently from upstream's Docker setup.

1. **The demo account is never created.** The admin account is created with the email given to Set Admin Password.
2. **The OwnTracks Recorder sync is one-way and polled,** so deleting tracks in the Recorder does not delete them in Dawarich.
3. **Only locations are synced from the Recorder** — not waypoints, region transitions, cards or friends.
4. **No OIDC sign-in, S3 storage, Prometheus metrics or watched-import folder** — none of them is configured by the package.
5. **Connect Immich accepts only the Immich account with the same email.** A person whose emails differ between the two apps can still connect on Dawarich's Integrations page, with a key they create in Immich and Immich's LAN IP address including its port: `.local` names don't resolve inside StartOS's containers.
6. **No armv7 or riscv64 build.**

---

## Quick Reference for AI Consumers

The package's operable surface in one block; each key mirrors a section above.

```yaml
package_id: dawarich
image: freikin/dawarich + dawarich/Dockerfile (CA store upgrade) # plus a built postgres+PostGIS image and valkey/valkey
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
  - immich # optional; enabled while an account is connected or waiting, then expected running
  - airtrail # optional; enabled while an account is connected, waiting or held, then expected running with its airtrail check
  - photon # optional; enabled while connected, then expected running with its photon check
interfaces:
  ui: { type: ui, port: 3000 }
actions:
  - set-admin-password
  - configure-smtp
  - set-primary-url
  - link-recorder-user # hidden until OwnTracks Recorder is installed
  - unlink-recorder-user # hidden until a user is linked
  - connect-immich # hidden until Immich is installed; disabled below Immich 3.3.3:1
  - disconnect-immich # hidden until an account is connected or waiting
  - connect-airtrail # hidden until AirTrail is installed
  - confirm-airtrail-account # only while an approved account is held
  - disconnect-airtrail # hidden until an account is connected, waiting or held
  - connect-photon # hidden until Photon is installed
  - disconnect-photon # hidden until connected
tasks:
  - { action: set-admin-password, severity: critical }
health_checks:
  - web
  - sidekiq
  - recorder-sync # only while a user is linked
  - recorder-missing # only while a user is linked and the Recorder is not installed
  - immich # only while Immich is installed
  - airtrail # only while AirTrail is installed
```
