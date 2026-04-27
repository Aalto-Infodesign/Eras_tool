#!/bin/bash

source /etc/sandbox/env
export DOCKER_HOST=unix://$XDG_RUNTIME_DIR/docker.sock

notify-send 'ERAS Tool' 'We are starting your application. This could take up to 1min. Browser will be started automatically when ready.'

# update images
docker pull europe-docker.pkg.dev/finngen-sandbox-v3-containers/eu.gcr.io/eras-tool:latest

# run
docker run --log-driver syslog --rm -d -p 8080:80 \
  europe-docker.pkg.dev/finngen-sandbox-v3-containers/eu.gcr.io/eras-tool:latest

echo "if the eras tool does not launch automatically, visit: http://localhost:8080"