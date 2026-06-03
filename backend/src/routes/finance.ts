import { Hono } from "hono";
import * as financeHistoryService from "../services/finance-history.service.ts";
import { authenticate, requireRole } from "../middleware/auth.ts";
import type { HonoEnv } from "../types.ts";

const router = new Hono<HonoEnv>();

router.use("*", authenticate);

// Complete, read-only history of every request in every state (FINANCIAL_ADMIN only).
router.get("/history", requireRole("FINANCIAL_ADMIN"), async (c) => {
  return c.json(await financeHistoryService.getFinanceHistory());
});

export default router;
