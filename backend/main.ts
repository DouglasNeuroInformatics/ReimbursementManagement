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
api.use("*", csrfProtect);
api.route("/auth", authRoutes);
api.route("/requests", requestRoutes);
api.route("/requests", approvalRoutes);
api.route("/requests", documentRoutes);
api.route("/users", userRoutes);
api.route("/supervisors", accountRoutes);

app.route("/api", api);

await initBucket();

console.log(`API server starting on port ${env.PORT}`);
Deno.serve({ port: env.PORT }, app.fetch);
