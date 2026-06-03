import { Hono } from "hono";
import * as reportService from "../services/report.service.ts";
import { authenticate } from "../middleware/auth.ts";
import type { HonoEnv } from "../types.ts";

const router = new Hono<HonoEnv>();

router.use("*", authenticate);

router.get("/:id", async (c) => {
  const { id: userId, role } = c.get("user");
  const report = await reportService.getReport(c.req.param("id"), userId, role);
  return c.json({ report });
});

export default router;
