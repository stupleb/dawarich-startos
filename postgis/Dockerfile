FROM postgres:17.12-trixie

# postgresql-17 too: PGDG builds PostGIS against its newest 17.x, which an older server can't load.
RUN apt-get update \
 && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends postgresql-17 postgresql-17-postgis-3 \
 && rm -rf /var/lib/apt/lists/*
