FROM node:20 AS dev-stage

# Install system dependencies
RUN apt-get update && apt-get install -y nano openssl software-properties-common

# Generate self-signed SSL certificate
RUN openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/ssl/private/privkey.pem \
    -out /etc/ssl/private/fullchain.pem \
    -subj "/C=DE/ST=_/L=_/O=_/OU=_/CN=localhost"

# Set up global npm directory
RUN mkdir -p /home/node/.npm-global 
RUN chown node:node /home/node/.npm-global 
RUN npm config set prefix /home/node/.npm-global 
RUN mkdir -p  /usr/local/lib/node_modules
RUN chown node:node  /usr/local/lib/node_modules
RUN npm config set prefix  /usr/local/lib/node_modules
# Create and set permissions for /app
RUN mkdir /app
WORKDIR /app
COPY ./ /app
RUN chown node:node /app -R
# Set environment variables
ARG OPENIMIS_CONF_JSON
ENV OPENIMIS_CONF_JSON=${OPENIMIS_CONF_JSON}
ENV NODE_ENV=development
USER node
ENTRYPOINT ["/bin/bash", "/app/script/entrypoint-dev.sh"]

FROM dev-stage AS build-stage
USER node
ENV GENERATE_SOURCEMAP=true
ENV NODE_ENV=production
# Slow/flaky link to npm + the git module repos. Set network resilience as ENV so it
# applies to EVERY npm invocation below (incl. the npm@11 self-upgrade) — was ETIMEDOUT.
ENV npm_config_fetch_timeout=1800000
ENV npm_config_fetch_retries=10
ENV npm_config_fetch_retry_mintimeout=20000
ENV npm_config_fetch_retry_maxtimeout=300000
# git module clones can stall indefinitely; abort a dead clone so the retry loop reacts
ENV GIT_HTTP_LOW_SPEED_LIMIT=1000
ENV GIT_HTTP_LOW_SPEED_TIME=60
RUN npm config set prefix /home/node/.npm-global
# npm@latest now resolves to npm 12, which requires Node >=22; this image is Node 20,
# so pin to npm 11 (the latest line compatible with Node 20.17+). Retry on flaky network.
RUN for i in 1 2 3 4 5; do npm install -g npm@11 && break || { echo "npm@11 attempt $i failed"; sleep 20; }; done
RUN npm run load-config
RUN for i in 1 2 3 4 5; do \
      echo "npm install attempt $i" && \
      npm install --include=dev --legacy-peer-deps && break || \
      { echo "attempt $i failed, retrying in 20s"; sleep 20; }; \
    done
RUN npm run build

FROM nginx:latest
COPY --from=build-stage /app/build/ /usr/share/nginx/html
COPY --from=build-stage /etc/ssl/private/ /etc/nginx/ssl/live/host
COPY ./conf /conf
COPY ./script/entrypoint.sh /script/entrypoint.sh
RUN openssl dhparam -out /etc/nginx/dhparam.pem 2048
RUN chmod a+x /script/entrypoint.sh
WORKDIR /script
ENV DATA_UPLOAD_MAX_MEMORY_SIZE=12582912
ENV NEW_OPENIMIS_HOST="localhost"
ENV PUBLIC_URL="front"
ENV REACT_APP_API_URL="api"
ENV ROOT_MOBILEAPI="rest"
ENV FORCE_RELOAD=""
ENV OPENSEARCH_PROXY_ROOT="opensearch"
ENTRYPOINT ["/bin/bash", "/script/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
