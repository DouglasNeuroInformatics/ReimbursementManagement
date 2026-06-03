import { assert, assertEquals, assertExists } from "jsr:@std/assert";
import {
  cleanupDatabase,
  createApproval,
  createSupervisorAccount,
  createTestRequest,
  createTestUser,
  createTestUsers,
  makeRequest,
} from "./test-utils.ts";

const API_BASE = "http://localhost:8000/api";

/**
 * Build a FINANCE_APPROVED reimbursement request owned by `user`, approved by
 * `supervisor` (with a billing account) and `admin`. Amounts are chosen so that
 * naive float summation (10.10 + 20.20 + 5.05) drifts off 35.35 — the report
 * must sum in integer cents.
 */
async function buildApprovedRequest(
  userId: string,
  supervisorId: string,
  adminId: string,
) {
  const request = await createTestRequest(
    userId,
    "REIMBURSEMENT",
    "FINANCE_APPROVED",
    "Conference travel",
    {
      reimbursement: {
        items: [
          { description: "Hotel", amount: 10.10, date: new Date("2026-01-10"), codeSecondaire: "1000" },
          { description: "Taxi", amount: 20.20, date: new Date("2026-01-11"), codeSecondaire: "1000" },
          { description: "Meals", amount: 5.05, date: new Date("2026-01-12"), codeSecondaire: "2000" },
        ],
      },
    },
  );

  const account = await createSupervisorAccount(supervisorId, "ACC-1", "Operating");
  await createApproval(request.id, supervisorId, "APPROVE", "SUPERVISOR", "Looks good", account.id);
  await createApproval(request.id, adminId, "APPROVE", "FINANCE", "Approved");

  return { request, account };
}

Deno.test({
  name: "Reports: GET /api/reports/:id - owner gets full report with cent-accurate totals",
  sanitizeResources: false,
  sanitizeOps: false,
}, async () => {
  await cleanupDatabase();
  const { admin, supervisor, user } = await createTestUsers();
  const { request } = await buildApprovedRequest(user.id, supervisor.id, admin.id);

  const res = await makeRequest(API_BASE, {
    method: "GET",
    path: `/reports/${request.id}`,
    cookieHeader: user.cookieHeader,
  });

  assertEquals(res.status, 200);
  const report = res.body.report;
  assertExists(report);

  // Request + requester identity
  assertEquals(report.request.id, request.id);
  assertEquals(report.request.status, "FINANCE_APPROVED");
  assertEquals(report.requester.email, user.email);

  // Line items flattened and sorted
  assertEquals(report.lineItems.length, 3);

  // Totals summed in integer cents (float addition would yield 35.349999…)
  assertEquals(report.totals.grandTotal, 35.35);
  const byCode = Object.fromEntries(
    report.totals.byCode.map((r: { code: string; amount: number }) => [r.code, r.amount]),
  );
  assertEquals(byCode["1000"], 30.30);
  assertEquals(byCode["2000"], 5.05);

  // Billing account comes from the supervisor APPROVE approval
  assertExists(report.billingAccount);
  assertEquals(report.billingAccount.accountNumber, "ACC-1");
  assertExists(report.supervisorApproval);
  assertEquals(report.financeApprovals.length, 1);
});

Deno.test({
  name: "Reports: GET /api/reports/:id - supervisor and admin may view, unrelated user is denied",
  sanitizeResources: false,
  sanitizeOps: false,
}, async () => {
  await cleanupDatabase();
  const { admin, supervisor, user } = await createTestUsers();
  const { request } = await buildApprovedRequest(user.id, supervisor.id, admin.id);

  const stranger = await createTestUser(
    "test-stranger@example.com",
    "TestPass123!",
    "Stranger",
    "User",
    "USER",
  );

  const asSupervisor = await makeRequest(API_BASE, {
    method: "GET",
    path: `/reports/${request.id}`,
    cookieHeader: supervisor.cookieHeader,
  });
  assertEquals(asSupervisor.status, 200);

  const asAdmin = await makeRequest(API_BASE, {
    method: "GET",
    path: `/reports/${request.id}`,
    cookieHeader: admin.cookieHeader,
  });
  assertEquals(asAdmin.status, 200);

  const asStranger = await makeRequest(API_BASE, {
    method: "GET",
    path: `/reports/${request.id}`,
    cookieHeader: stranger.cookieHeader,
  });
  assertEquals(asStranger.status, 403);
  assertEquals(asStranger.body.code, "REQUEST_ACCESS_DENIED");
});

Deno.test({
  name: "Reports: GET /api/reports/:id - rejected for non-approved status",
  sanitizeResources: false,
  sanitizeOps: false,
}, async () => {
  await cleanupDatabase();
  const { user } = await createTestUsers();
  const draft = await createTestRequest(user.id, "REIMBURSEMENT", "DRAFT", "Draft request", {
    reimbursement: {
      items: [{ description: "Pens", amount: 3.00, date: new Date("2026-02-01") }],
    },
  });

  const res = await makeRequest(API_BASE, {
    method: "GET",
    path: `/reports/${draft.id}`,
    cookieHeader: user.cookieHeader,
  });

  assertEquals(res.status, 400);
  assertEquals(res.body.code, "REPORT_WRONG_STATUS");
});

Deno.test({
  name: "Reports: GET /api/reports/:id - 404 for unknown request",
  sanitizeResources: false,
  sanitizeOps: false,
}, async () => {
  await cleanupDatabase();
  const { user } = await createTestUsers();

  const res = await makeRequest(API_BASE, {
    method: "GET",
    path: `/reports/${crypto.randomUUID()}`,
    cookieHeader: user.cookieHeader,
  });

  assertEquals(res.status, 404);
  assertEquals(res.body.code, "REQUEST_NOT_FOUND");
});
