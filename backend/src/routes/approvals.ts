import { Hono } from "hono";
import { z } from "zod";
import * as approvalService from "../services/approval.service.ts";
import * as classificationService from "../services/classification.service.ts";
import { authenticate, requireRole } from "../middleware/auth.ts";
import { codeSecondaireSchema } from "../lib/code-secondaire.ts";
import { getEnv } from "../lib/env.ts";
import type { HonoEnv } from "../types.ts";

const router = new Hono<HonoEnv>();

router.use("*", authenticate);

const supervisorApproveSchema = z.object({
  accountId: z.string().uuid("accountId must be a valid UUID"),
  comment: z.string().max(2000).optional(),
});

const commentSchema = z.object({
  comment: z.string().max(2000).optional(),
});

const classifyItemSchema = z.object({
  itemId: z.string().uuid(),
  itemType: z.enum(["reimbursement", "travel_advance", "travel_expense"]),
  codeSecondaire: codeSecondaireSchema,
});

router.post(
  "/:id/supervisor-approve",
  requireRole("SUPERVISOR", "FINANCIAL_ADMIN"),
  async (c) => {
    const { id: supervisorId, role } = c.get("user");
    const body = await c.req.json();
    const { accountId, comment } = supervisorApproveSchema.parse(body);
    const request = await approvalService.supervisorApprove(
      c.req.param("id"),
      supervisorId,
      accountId,
      comment,
      role
    );
    return c.json({ request });
  },
);

router.post(
  "/:id/supervisor-reject",
  requireRole("SUPERVISOR", "FINANCIAL_ADMIN"),
  async (c) => {
    const { id: supervisorId, role } = c.get("user");
    const body = await c.req.json();
    const { comment } = commentSchema.parse(body);
    const request = await approvalService.supervisorReject(c.req.param("id"), supervisorId, comment, role);
    return c.json({ request });
  },
);

router.post(
  "/:id/finance-approve",
  requireRole("FINANCIAL_ADMIN"),
  async (c) => {
    const { id: adminId } = c.get("user");
    const body = await c.req.json();
    const { comment } = commentSchema.parse(body);
    const request = await approvalService.financeApprove(c.req.param("id"), adminId, comment);
    return c.json({ request, requiredFinanceApprovals: getEnv().REQUIRED_FINANCE_APPROVALS });
  },
);

router.post(
  "/:id/finance-reject",
  requireRole("FINANCIAL_ADMIN"),
  async (c) => {
    const { id: adminId } = c.get("user");
    const body = await c.req.json();
    const { comment } = commentSchema.parse(body);
    const request = await approvalService.financeReject(c.req.param("id"), adminId, comment);
    return c.json({ request });
  },
);

router.post(
  "/:id/mark-paid",
  requireRole("FINANCIAL_ADMIN"),
  async (c) => {
    const { id: adminId } = c.get("user");
    const body = await c.req.json();
    const { comment } = commentSchema.parse(body);
    const request = await approvalService.markPaid(c.req.param("id"), adminId, comment);
    return c.json({ request });
  },
);

router.patch(
  "/:id/classify-item",
  requireRole("FINANCIAL_ADMIN"),
  async (c) => {
    const { id: adminId } = c.get("user");
    const body = await c.req.json();
    const { itemId, itemType, codeSecondaire } = classifyItemSchema.parse(body);
    const result = await classificationService.classifyItem(
      c.req.param("id"),
      itemId,
      itemType,
      codeSecondaire,
      adminId,
    );
    return c.json(result);
  },
);

export default router;
