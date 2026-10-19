#!/bin/sh
set -eu
mkdir -p /etc/nginx/certsync-training
: > /etc/nginx/certsync-training/framing.conf
if [ "${CERTSYNC_TRAINING_ENABLED:-false}" = "true" ]; then
    origin="${CERTSYNC_FRAME_ANCESTORS:-https://certsync-platform.montimage.eu}"
    # A single HTTPS origin, never arbitrary nginx configuration.
    if ! printf '%s' "$origin" | grep -Eq '^https://[A-Za-z0-9.-]+(:[0-9]+)?$'; then
        echo 'CERTSYNC_FRAME_ANCESTORS must be one HTTPS origin' >&2
        exit 1
    fi
    printf 'add_header Content-Security-Policy "frame-ancestors %s" always;\n' "$origin" > /etc/nginx/certsync-training/framing.conf
fi
