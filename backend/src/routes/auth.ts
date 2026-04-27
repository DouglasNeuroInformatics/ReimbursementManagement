import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { z } from "zod";
import * as authService from "../services/auth.service.ts";
import { authenticate, csrfProtect, rateLimitAuth } from '../middleware/auth.ts';
import { AppError } from "../middleware/error.ts";
import { getEnv } from "../lib/env.ts";
import type { HonoEnv } from "../types.ts";

const router = new Hono<HonoEnv>();

router.use('*', rateLimitAuth)

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "Strict" as const,
    path: "/",
    secure: getEnv().NODE_ENV === "production",
    maxAge,
  };
}

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post("/register", async (c) => {
  const body = await c.req.json();
  const data = registerSchema.parse(body);
  const user = await authService.register(data);
  return c.json({ user }, 201);
});

router.post("/login", async (c) => {
  const body = await c.req.json();
  const { email, password } = loginSchema.parse(body);
  const result = await authService.login(email, password);
  setCookie(c, "access_token", result.accessToken, cookieOptions(15 * 60));
  setCookie(c, "refresh_token", result.refreshToken, cookieOptions(7 * 24 * 60 * 60));
  return c.json({ user: result.user });
});

router.post("/logout", csrfProtect, async (c) => {
  const refreshToken = getCookie(c, "refresh_token");
  if (refreshToken) await authService.logout(refreshToken);
  deleteCookie(c, "access_token", { path: "/" });
  deleteCookie(c, "refresh_token", { path: "/" });
  return c.json({ success: true });
});

router.post("/refresh", csrfProtect, async (c) => {
  const refreshToken = getCookie(c, "refresh_token");
  if (!refreshToken) throw new AppError(401, "No refresh token provided");
  const result = await authService.refresh(refreshToken);
  setCookie(c, "access_token", result.accessToken, cookieOptions(15 * 60));
  return c.json({ success: true });
});

router.get("/me", authenticate, async (c) => {
  const { id } = c.get("user");
  const user = await authService.getMe(id);
  return c.json({ user });
});


const profileSchema = z.object({
  address: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  extension: z.string().nullable().optional(),
  jobPosition: z.string().nullable().optional(),
});

router.patch("/me", authenticate, csrfProtect, async (c) => {
  const { id } = c.get("user");
  const body = await c.req.json();
  const data = profileSchema.parse(body);
  const user = await authService.updateMe(id, data);
  return c.json({ user });
});
export default router;
