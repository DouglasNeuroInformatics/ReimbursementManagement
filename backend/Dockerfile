FROM docker.io/denoland/deno:2.3.3
WORKDIR /app
COPY deno.json deno.lock* ./
COPY prisma/ ./prisma/
COPY prisma.config.ts ./
RUN deno install --allow-scripts
RUN DATABASE_URL="postgresql://dummy@localhost/dummy" deno run -A npm:prisma@^7 generate
COPY src/ ./src/
COPY main.ts ./
RUN deno cache main.ts
EXPOSE 8000
CMD ["deno", "run", "-A", "--node-modules-dir=auto", "main.ts"]
