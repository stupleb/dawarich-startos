# AGENTS.md

This is a StartOS service-package repository — it builds a `.s9pk` for StartOS.

Develop it inside a StartOS packaging workspace created by `start-cli s9pk init-workspace`,
which provides the packaging guide and agent context one level up. If you're reading this in a
bare clone with no workspace, the full guide is at <https://docs.start9.com/packaging>.

**Start every task at the recipe index** — `../start-technologies/projects/start-sdk/docs/src/recipes.md`
(or <https://docs.start9.com/packaging/recipes.html>). It maps an intent ("prompt the user to create
admin credentials", "expose a web UI") to the constructs, the reference pages, and a named production
package to copy. Find the recipe before you read this package's neighbours: a package you reach by
grepping may be non-conformant, and the recipe outranks it.

Work this package's `TODO.md` from top to bottom. Keep `README.md` (technical reference for an AI support or administering agent) and `instructions.md` (end-user docs) in sync with your changes.

## This repo

- **Nothing may run upstream's `db:seed` before `setup` has created the admin.** The seed creates `demo@dawarich.app` / `safepassword` whenever the users table is empty, which is why `web` (whose entrypoint seeds) requires `admin-applied`.
- **Don't set Dawarich's instance-setting variables** (`PHOTON_API_HOST`, `GEOAPIFY_API_KEY`, `STORE_GEODATA`, …) from `main.ts`: each one pins its field read-only under Settings → Instance.
- **Keep `assets/recorder-sync.rb` on Dawarich's public API** (`/api/v1/imports`, `/api/v1/owntracks/points`) and Ruby's standard library. `rails runner` calls into Dawarich's internals break on upgrades, and the script runs with plain `ruby`, not `bundle exec`.
- **Test the Ruby assets outside StartOS** by running them in the `freikin/dawarich` image against a local PostGIS + Valkey + Dawarich stack, with the environment `main.ts` passes — much faster than a sideload per change.
