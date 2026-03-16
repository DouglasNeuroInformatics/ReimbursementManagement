# Build stage for frontend
FROM docker.io/denoland/deno:2.3.3 AS frontend-build
WORKDIR /app
ARG VITE_CURRENCY=CAD
ENV VITE_CURRENCY=$VITE_CURRENCY
COPY frontend/deno.json frontend/deno.lock ./
RUN deno install
COPY frontend/ ./
RUN deno task build

# Final stage: Caddy with built frontend
FROM docker.io/caddy:2-alpine
COPY --from=frontend-build /app/dist /srv
