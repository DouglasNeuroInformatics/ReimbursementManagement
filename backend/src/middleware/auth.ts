import type { MiddlewareHandler } from "hono";
import { getCookie } from "hono/cookie";
import { verifyAccessToken } from "../lib/jwt.ts";
import { AppError } from "./error.ts";
import type { AuthUser, HonoEnv } from "../types.ts";

export const authenticate: MiddlewareHandler<HonoEnv> = async (c, next) => {
  const token = getCookie(c, "access_token");
  if (!token) throw new AppError(401, "Authentication required");
  try {
    const payload = await verifyAccessToken(token);
    c.set("user", { id: payload.sub, role: payload.role, email: payload.email });
  } catch {
    throw new AppError(401, "Invalid or expired token");
  }
  await next();
};

export const csrfProtect: MiddlewareHandler = async (c, next) => {
  const method = c.req.method;
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    const xrw = c.req.header("X-Requested-With");
    if (xrw !== "XMLHttpRequest") {
      throw new AppError(403, "CSRF check failed: missing X-Requested-With header");
    }
  }
  await next();
};

export function requireRole(...roles: AuthUser["role"][]): MiddlewareHandler<HonoEnv> {
  return async (c, next) => {
    const user = c.get("user");
    if (!user) throw new AppError(401, "Authentication required");
    if (!roles.includes(user.role)) {
      throw new AppError(403, `Access denied. Required role(s): ${roles.join(", ")}`);
    }
    await next();
  };
}

const _rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 15;
const RATE_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_CLEANUP_INTERVAL_MS = 5 * 60_000;

let _lastCleanup = Date.now();
function _cleanupExpiredEntries(): void {
  const now = Date.now();
  if (now - _lastCleanup < RATE_LIMIT_CLEANUP_INTERVAL_MS) return;
  _lastCleanup = now;
  for (const [key, record] of _rateLimitStore) {
    if (record.resetAt <= now) _rateLimitStore.delete(key);
  }
}

function _getClientIp(c: Parameters<MiddlewareHandler>[0]): string {
  // Only trust X-Forwarded-For when behind a known reverse proxy.
  // In this deployment, Caddy sets X-Real-IP which is more reliable
  // than X-Forwarded-For (which can be spoofed by the client).
  return (
    c.req.header("X-Real-IP") ??
    c.req.header("X-Forwarded-For")?.split(",")[0].trim() ??
    "unknown"
  );
}

export const rateLimitAuth: MiddlewareHandler = async (c, next) => {
  _cleanupExpiredEntries();
  const ip = _getClientIp(c);
  const now = Date.now();
  let record = _rateLimitStore.get(ip);
  if (!record || record.resetAt <= now) {
    record = { count: 1, resetAt: now + RATE_WINDOW_MS };
    _rateLimitStore.set(ip, record);
  } else {
    record.count++;
    if (record.count > RATE_LIMIT_MAX) {
      throw new AppError(429, "Too many requests — please wait a minute and try again");
    }
  }
  await next();
};