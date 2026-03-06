import { Hono } from "hono";
import { z } from "zod";
import * as approvalService from "../services/approval.service.ts";
import { authenticate, requireRole } from "../middleware/auth.ts";
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

router.post(
  "/:id/supervisor-approve",
  requireRole("SUPERVISOR", "FINANCIAL_ADMIN"),
  async (c) => {
    const { id: supervisorId } = c.get("user");
    const body = await c.req.json();
    const { accountId, comment } = supervisorApproveSchema.parse(body);
    const request = await approvalService.supervisorApprove(
      c.req.param("id"),
      supervisorId,
      accountId,
      comment,
    );
    return c.json({ request });
  },
);

router.post(
  "/:id/supervisor-reject",
  requireRole("SUPERVISOR", "FINANCIAL_ADMIN"),
  async (c) => {
    const { id: supervisorId } = c.get("user");
    const body = await c.req.json();
    const { comment } = commentSchema.parse(body);
    await approvalService.supervisorReject(c.req.param("id"), supervisorId, comment);
    return c.json({ success: true });
  },
);

router.post(
  "/:id/finance-approve",
  requireRole("FINANCIAL_ADMIN"),
  async (c) => {
    const { id: adminId } = c.get("user");
    const body = await c.req.json();
    const { comment } = commentSchema.parse(body);
    await approvalService.financeApprove(c.req.param("id"), adminId, comment);
    return c.json({ success: true });
  },
);

router.post(
  "/:id/finance-reject",
  requireRole("FINANCIAL_ADMIN"),
  async (c) => {
    const { id: adminId } = c.get("user");
    const body = await c.req.json();
    const { comment } = commentSchema.parse(body);
    await approvalService.financeReject(c.req.param("id"), adminId, comment);
    return c.json({ success: true });
  },
);

router.post(
  "/:id/mark-paid",
  requireRole("FINANCIAL_ADMIN"),
  async (c) => {
    const { id: adminId } = c.get("user");
    const body = await c.req.json();
    const { comment } = commentSchema.parse(body);
    await approvalService.markPaid(c.req.param("id"), adminId, comment);
    return c.json({ success: true });
  },
);

export default router;
