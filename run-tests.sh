#!/usr/bin/env bash

# Set error handling to exit on any failure
set -e

# Cleanup function that runs on exit
cleanup() {
    echo "Cleaning up test infrastructure..."
    # Always specify project gracefully to avoid matching global compose
    docker compose -f docker-compose.dev.yml stop db rustfs
    echo "Cleanup complete."
}

# Register the cleanup function to be called on the EXIT signal (whether success or failure)
trap cleanup EXIT

echo "Starting test infrastructure..."
docker compose -f docker-compose.dev.yml up -d db rustfs

echo "Waiting for database to be ready..."
# Wait for postgres to be healthy
until docker compose -f docker-compose.dev.yml exec -T db pg_isready -U app -d reimbursement > /dev/null 2>&1; do
  echo "Waiting for Postgres..."
  sleep 2
done
echo "Database is ready!"

echo "Ensuring test database exists..."
# Use -T to disable TTY allocation which can cause errors in CI or scripts
docker compose -f docker-compose.dev.yml exec -T db psql -U app -d postgres -tc "SELECT 1 FROM pg_database WHERE datname = 'reimbursement_test'" | grep -q 1 || docker compose -f docker-compose.dev.yml exec -T db psql -U app -d postgres -c "CREATE DATABASE reimbursement_test"

echo "Pushing Prisma schema to test database..."
cd backend
deno run -A --env-file=.env.test npm:prisma@^7 db push --accept-data-loss
cd ..

echo "Running backend tests..."
cd backend
deno task test
cd ..

echo "Running frontend tests..."
cd frontend
deno task test
cd ..

echo "Tests completed successfully."
