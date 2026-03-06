import { Hono } from "hono";
import { z } from "zod";
import * as userService from "../services/user.service.ts";
import { authenticate, requireRole } from "../middleware/auth.ts";
import type { HonoEnv } from "../types.ts";

const router = new Hono<HonoEnv>();

router.use("*", authenticate);

const updateUserSchema = z.object({
  role: z.enum(["USER", "SUPERVISOR", "FINANCIAL_ADMIN"]).optional(),
  supervisorId: z.string().uuid().nullable().optional(),
});

router.get("/", requireRole("FINANCIAL_ADMIN", "SUPERVISOR"), async (c) => {
  const users = await userService.listUsers();
  return c.json({ users });
});

router.patch("/:id", requireRole("FINANCIAL_ADMIN"), async (c) => {
  const targetId = c.req.param("id");
  const body = await c.req.json();
  const data = updateUserSchema.parse(body);
  const user = await userService.updateUser(targetId, data);
  return c.json({ user });
});

export default router;
