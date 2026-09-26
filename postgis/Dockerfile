FROM postgres:17.11-trixie

RUN apt-get update \
 && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends postgresql-17-postgis-3 \
 && rm -rf /var/lib/apt/lists/*
