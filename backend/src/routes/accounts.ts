import { Hono } from "hono";
import { z } from "zod";
import * as accountService from "../services/account.service.ts";
import { authenticate, requireRole } from "../middleware/auth.ts";
import { AppError } from "../middleware/error.ts";
import type { HonoEnv } from "../types.ts";

const router = new Hono<HonoEnv>();

router.use("*", authenticate);

const createAccountSchema = z.object({
  accountNumber: z.string().min(1, "Account number is required"),
  label: z.string().min(1, "Label is required"),
});

const updateAccountSchema = z.object({
  accountNumber: z.string().min(1).optional(),
  label: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

// SUPERVISOR: get own active accounts (for approval dropdown)
// NOTE: registered before /:supervisorId/accounts to avoid ambiguity at list level;
// the /mine path is entirely static so it won't clash with DELETE/PATCH on /:accountId
router.get("/:supervisorId/accounts/mine", requireRole("SUPERVISOR"), async (c) => {
  const { id: userId } = c.get("user");
  const supervisorId = c.req.param("supervisorId");
  if (supervisorId !== userId) {
    throw new AppError(403, "Can only view your own accounts");
  }
  const accounts = await accountService.getActiveAccounts(supervisorId);
  return c.json({ accounts });
});

// FINANCIAL_ADMIN: list all accounts for a supervisor
router.get("/:supervisorId/accounts", requireRole("FINANCIAL_ADMIN"), async (c) => {
  const supervisorId = c.req.param("supervisorId");
  const accounts = await accountService.getAccounts(supervisorId);
  return c.json({ accounts });
});

// FINANCIAL_ADMIN: create account
router.post("/:supervisorId/accounts", requireRole("FINANCIAL_ADMIN"), async (c) => {
  const supervisorId = c.req.param("supervisorId");
  const body = await c.req.json();
  const data = createAccountSchema.parse(body);
  const account = await accountService.createAccount(supervisorId, data);
  return c.json({ account }, 201);
});

// FINANCIAL_ADMIN: update account
router.patch(
  "/:supervisorId/accounts/:accountId",
  requireRole("FINANCIAL_ADMIN"),
  async (c) => {
    const supervisorId = c.req.param("supervisorId");
    const accountId = c.req.param("accountId");
    const body = await c.req.json();
    const data = updateAccountSchema.parse(body);
    const account = await accountService.updateAccount(supervisorId, accountId, data);
    return c.json({ account });
  },
);

// FINANCIAL_ADMIN: deactivate account
router.delete(
  "/:supervisorId/accounts/:accountId",
  requireRole("FINANCIAL_ADMIN"),
  async (c) => {
    const supervisorId = c.req.param("supervisorId");
    const accountId = c.req.param("accountId");
    const account = await accountService.deactivateAccount(supervisorId, accountId);
    return c.json({ account });
  },
);

export default router;
