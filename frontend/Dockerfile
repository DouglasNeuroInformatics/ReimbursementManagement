FROM docker.io/denoland/deno:2.3.3 AS build
WORKDIR /app

# Copy Deno config and lock file
COPY deno.json deno.lock ./

# Install dependencies (creates node_modules for Vite plugins)
RUN deno install

# Copy source code
COPY . .

# Set build environment variable
ARG VITE_CURRENCY=CAD
ENV VITE_CURRENCY=$VITE_CURRENCY

# Build the application
RUN deno task build

# Production stage: serve with Caddy
FROM docker.io/caddy:2-alpine
COPY --from=build /app/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile
