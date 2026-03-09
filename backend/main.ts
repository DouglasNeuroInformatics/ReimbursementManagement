import { Hono } from "hono";
import { logger } from "hono/logger";
import { getEnv } from "./src/lib/env.ts";
import { errorHandler } from "./src/middleware/error.ts";
import { csrfProtect } from "./src/middleware/auth.ts";
import authRoutes from "./src/routes/auth.ts";
import requestRoutes from "./src/routes/requests.ts";
import approvalRoutes from "./src/routes/approvals.ts";
import documentRoutes from "./src/routes/documents.ts";
import userRoutes from "./src/routes/users.ts";
import accountRoutes from "./src/routes/accounts.ts";
import { initBucket } from "./src/lib/s3.ts";

const env = getEnv();
const app = new Hono();

app.use("*", logger());
app.onError(errorHandler);

app.get("/healthz", (c) => c.json({ status: "ok" }));

const api = new Hono();

// Auth routes (no CSRF - public endpoints)
api.route("/auth", authRoutes);

// Supervisor accounts (no CSRF - only FINANCIAL_ADMIN can access, role check in route)
api.route("/supervisors", accountRoutes);

// Protected routes (require CSRF)
api.use("*", async (c, next) => {
  const path = c.req.path;
  // Allow auth and supervisors paths without CSRF
  if (path.startsWith("/api/auth") || path.startsWith("/api/supervisors")) {
    return next();
  }
  // Apply CSRF check for all other paths
  const xrw = c.req.header("X-Requested-With");
  if (xrw !== "XMLHttpRequest") {
    return c.json({ error: "CSRF check failed: missing X-Requested-With header" }, 403);
  }
  await next();
});

api.route("/requests", requestRoutes);
api.route("/requests", approvalRoutes);
api.route("/requests", documentRoutes);
api.route("/users", userRoutes);

app.route("/api", api);

// Initialize S3 bucket with retry logic for development
async function initBucketWithRetry(maxRetries = 10): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await initBucket();
      console.log("S3 bucket initialized successfully");
      return;
    } catch (err) {
      const lastRetry = i === maxRetries - 1;
      if (lastRetry) {
        console.error(`Failed to initialize S3 bucket after ${maxRetries} attempts:`, err);
        throw err;
      }
      console.warn(`S3 not ready yet (attempt ${i + 1}/${maxRetries}), retrying in 2 seconds...`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}

await initBucketWithRetry();

console.log(`API server starting on port ${env.PORT}`);
Deno.serve({ port: env.PORT }, app.fetch);
