import { Hono } from "hono";
import { z } from "zod";
import * as requestService from "../services/request.service.ts";
import { authenticate } from "../middleware/auth.ts";
import type { HonoEnv } from "../types.ts";

const router = new Hono<HonoEnv>();

router.use("*", authenticate);

const listQuerySchema = z.object({
  status: z.enum([
    "DRAFT", "SUBMITTED", "SUPERVISOR_APPROVED", "SUPERVISOR_REJECTED",
    "FINANCE_APPROVED", "FINANCE_REJECTED", "PAID",
  ]).optional(),
  type: z.enum(["REIMBURSEMENT", "TRAVEL_ADVANCE", "TRAVEL_REIMBURSEMENT"]).optional(),
  scope: z.enum(["own"]).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  cursor: z.string().uuid().optional(),
});

const createSchema = z.object({
  type: z.enum(["REIMBURSEMENT", "TRAVEL_ADVANCE", "TRAVEL_REIMBURSEMENT"]),
  title: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
});

const updateSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).nullable().optional(),
  reimbursement: z
    .object({
      items: z
        .array(
          z.object({
            description: z.string().min(1),
            amount: z.number().positive(),
            date: z.string().datetime(),
            vendor: z.string().nullable().optional(),
            notes: z.string().nullable().optional(),
          }),
        )
        .optional(),
    })
    .optional(),
  travelAdvance: z
    .object({
      destination: z.string().min(1).optional(),
      purpose: z.string().min(1).optional(),
      departureDate: z.string().datetime().optional(),
      returnDate: z.string().datetime().optional(),
      estimatedAmount: z.number().positive().optional(),
      items: z
        .array(
          z.object({
            category: z.string().min(1),
            amount: z.number().positive(),
            notes: z.string().nullable().optional(),
          }),
        )
        .optional(),
    })
    .optional(),
  travelReimbursement: z
    .object({
      destination: z.string().min(1).optional(),
      purpose: z.string().min(1).optional(),
      departureDate: z.string().datetime().optional(),
      returnDate: z.string().datetime().optional(),
      totalAmount: z.number().positive().optional(),
      advanceRequestId: z.string().uuid().nullable().optional(),
      items: z
        .array(
          z.object({
            date: z.string().datetime(),
            category: z.string().min(1),
            amount: z.number().positive(),
            vendor: z.string().nullable().optional(),
            notes: z.string().nullable().optional(),
          }),
        )
        .optional(),
    })
    .optional(),
});

router.get("/", async (c) => {
  const { id: userId, role } = c.get("user");
  const query = listQuerySchema.parse(c.req.query());
  const result = await requestService.getRequests(userId, role, {
    status: query.status,
    type: query.type,
    scope: query.scope,
    limit: query.limit,
    cursor: query.cursor,
  });
  return c.json(result);
});

router.post("/", async (c) => {
  const { id: userId } = c.get("user");
  const body = await c.req.json();
  const data = createSchema.parse(body);
  const request = await requestService.createRequest(userId, data);
  return c.json({ request }, 201);
});

router.get("/:id", async (c) => {
  const { id: userId, role } = c.get("user");
  const request = await requestService.getRequest(c.req.param("id"), userId, role);
  return c.json({ request });
});

router.patch("/:id", async (c) => {
  const { id: userId, role } = c.get("user");
  const body = await c.req.json();
  const data = updateSchema.parse(body);
  const request = await requestService.updateRequest(c.req.param("id"), userId, role, data);
  return c.json({ request });
});

router.delete("/:id", async (c) => {
  const { id: userId } = c.get("user");
  await requestService.deleteRequest(c.req.param("id"), userId);
  return c.json({ success: true });
});

router.post("/:id/submit", async (c) => {
  const { id: userId } = c.get("user");
  const request = await requestService.submitRequest(c.req.param("id"), userId);
  return c.json({ request });
});

router.post("/:id/revise", async (c) => {
  const { id: userId } = c.get("user");
  const request = await requestService.reviseRequest(c.req.param("id"), userId);
  return c.json({ request });
});

export default router;
