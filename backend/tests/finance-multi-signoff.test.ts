import { assertEquals, assertExists, assert } from "jsr:@std/assert";
import { cleanupDatabase, createTestUsers, createTestRequest, createApproval, createSupervisorAccount, makeRequest, parseSetCookie } from "./test-utils.ts";
import { prisma } from "./test-utils.ts";

const API_BASE = "http://localhost:8000/api";

Deno.test({ name: "Code Secondaire: GET /api/code-secondaire returns codes", sanitizeResources: false, sanitizeOps: false }, async () => {
  const response = await makeRequest(API_BASE, {
    method: "GET",
    path: "/code-secondaire",
  });

  assertEquals(response.status, 200);
  assertExists(response.body.codes);
  assert(response.body.codes.length >= 29);
  assertExists(response.body.codes[0].code);
  assertExists(response.body.codes[0].description);
});

Deno.test({ name: "Classification: PATCH classify-item - classify reimbursement item", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { admin, supervisor, user } = await createTestUsers();
  const account = await createSupervisorAccount(supervisor.id, "CLS-001", "Classify Account");

  const request = await createTestRequest(user.id, "REIMBURSEMENT", "SUPERVISOR_APPROVED", "Classify Test", {
    reimbursement: {
      items: [
        { description: "Item 1", amount: 100.0, date: new Date("2026-03-01") },
      ],
    },
  });
  await createApproval(request.id, supervisor.id, "APPROVE", "SUPERVISOR", account.id);

  const items = await prisma.reimbursementItem.findMany({
    where: { detail: { requestId: request.id } },
  });

  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: { email: admin.email, password: admin.password },
  });
  assertEquals(loginResponse.status, 200);
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));

  const response = await makeRequest(API_BASE, {
    method: "PATCH",
    path: `/requests/${request.id}/classify-item`,
    cookieHeader: cookies.cookieHeader,
    body: {
      itemId: items[0].id,
      itemType: "reimbursement",
      codeSecondaire: "52010",
    },
  });

  assertEquals(response.status, 200);
  assertEquals(response.body.success, true);
  assertEquals(response.body.codeSecondaire, "52010");

  const updatedItem = await prisma.reimbursementItem.findUnique({ where: { id: items[0].id } });
  assertEquals(updatedItem!.codeSecondaire, "52010");
});

Deno.test({ name: "Classification: PATCH classify-item - classify travel advance item", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { admin, supervisor, user } = await createTestUsers();
  const account = await createSupervisorAccount(supervisor.id, "CLS-TA", "TA Account");

  const request = await createTestRequest(user.id, "TRAVEL_ADVANCE", "SUPERVISOR_APPROVED", "TA Classify", {
    travelAdvance: {
      destination: "Montreal",
      purpose: "Conference",
      departureDate: new Date("2026-04-01"),
      returnDate: new Date("2026-04-03"),
      estimatedAmount: 1500,
      items: [{ category: "Airfare", amount: 800 }],
    },
  });
  await createApproval(request.id, supervisor.id, "APPROVE", "SUPERVISOR", account.id);

  const items = await prisma.travelAdvanceItem.findMany({
    where: { detail: { requestId: request.id } },
  });

  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: { email: admin.email, password: admin.password },
  });
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));

  const response = await makeRequest(API_BASE, {
    method: "PATCH",
    path: `/requests/${request.id}/classify-item`,
    cookieHeader: cookies.cookieHeader,
    body: {
      itemId: items[0].id,
      itemType: "travel_advance",
      codeSecondaire: "66340",
    },
  });

  assertEquals(response.status, 200);
  assertEquals(response.body.success, true);

  const updatedItem = await prisma.travelAdvanceItem.findUnique({ where: { id: items[0].id } });
  assertEquals(updatedItem!.codeSecondaire, "66340");
});

Deno.test({ name: "Classification: PATCH classify-item - classify travel expense item", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { admin, supervisor, user } = await createTestUsers();
  const account = await createSupervisorAccount(supervisor.id, "CLS-TR", "TR Account");

  const request = await createTestRequest(user.id, "TRAVEL_REIMBURSEMENT", "SUPERVISOR_APPROVED", "TR Classify", {
    travelReimbursement: {
      destination: "Toronto",
      purpose: "Meeting",
      departureDate: new Date("2026-05-01"),
      returnDate: new Date("2026-05-02"),
      totalAmount: 500,
      items: [{ date: new Date("2026-05-01"), category: "Hotel", amount: 300 }],
    },
  });
  await createApproval(request.id, supervisor.id, "APPROVE", "SUPERVISOR", account.id);

  const items = await prisma.travelExpenseItem.findMany({
    where: { detail: { requestId: request.id } },
  });

  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: { email: admin.email, password: admin.password },
  });
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));

  const response = await makeRequest(API_BASE, {
    method: "PATCH",
    path: `/requests/${request.id}/classify-item`,
    cookieHeader: cookies.cookieHeader,
    body: {
      itemId: items[0].id,
      itemType: "travel_expense",
      codeSecondaire: "66340",
    },
  });

  assertEquals(response.status, 200);
  const updatedItem = await prisma.travelExpenseItem.findUnique({ where: { id: items[0].id } });
  assertEquals(updatedItem!.codeSecondaire, "66340");
});

Deno.test({ name: "Classification: PATCH classify-item - rejects invalid code", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { admin, supervisor, user } = await createTestUsers();
  const account = await createSupervisorAccount(supervisor.id, "INV-001", "Invalid Account");

  const request = await createTestRequest(user.id, "REIMBURSEMENT", "SUPERVISOR_APPROVED", "Invalid Code", {
    reimbursement: {
      items: [{ description: "Item 1", amount: 100.0, date: new Date("2026-03-01") }],
    },
  });
  await createApproval(request.id, supervisor.id, "APPROVE", "SUPERVISOR", account.id);

  const items = await prisma.reimbursementItem.findMany({
    where: { detail: { requestId: request.id } },
  });

  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: { email: admin.email, password: admin.password },
  });
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));

  const response = await makeRequest(API_BASE, {
    method: "PATCH",
    path: `/requests/${request.id}/classify-item`,
    cookieHeader: cookies.cookieHeader,
    body: {
      itemId: items[0].id,
      itemType: "reimbursement",
      codeSecondaire: "99999",
    },
  });

  assertEquals(response.status, 422);
});

Deno.test({ name: "Classification: PATCH classify-item - rejects non-finance user", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { supervisor, user } = await createTestUsers();
  const account = await createSupervisorAccount(supervisor.id, "NF-001", "Non Finance Account");

  const request = await createTestRequest(user.id, "REIMBURSEMENT", "SUPERVISOR_APPROVED", "Non Finance", {
    reimbursement: {
      items: [{ description: "Item 1", amount: 100.0, date: new Date("2026-03-01") }],
    },
  });
  await createApproval(request.id, supervisor.id, "APPROVE", "SUPERVISOR", account.id);

  const items = await prisma.reimbursementItem.findMany({
    where: { detail: { requestId: request.id } },
  });

  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: { email: user.email, password: user.password },
  });
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));

  const response = await makeRequest(API_BASE, {
    method: "PATCH",
    path: `/requests/${request.id}/classify-item`,
    cookieHeader: cookies.cookieHeader,
    body: {
      itemId: items[0].id,
      itemType: "reimbursement",
      codeSecondaire: "52010",
    },
  });

  assertEquals(response.status, 403);
});

Deno.test({ name: "Classification: PATCH classify-item - rejects classification on non-actionable status", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { admin, user } = await createTestUsers();

  const request = await createTestRequest(user.id, "REIMBURSEMENT", "DRAFT", "Draft Classify", {
    reimbursement: {
      items: [{ description: "Item 1", amount: 100.0, date: new Date("2026-03-01") }],
    },
  });

  const items = await prisma.reimbursementItem.findMany({
    where: { detail: { requestId: request.id } },
  });

  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: { email: admin.email, password: admin.password },
  });
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));

  const response = await makeRequest(API_BASE, {
    method: "PATCH",
    path: `/requests/${request.id}/classify-item`,
    cookieHeader: cookies.cookieHeader,
    body: {
      itemId: items[0].id,
      itemType: "reimbursement",
      codeSecondaire: "52010",
    },
  });

  assertEquals(response.status, 400);
});

Deno.test({ name: "Multi-signoff: first finance approval sets FINANCE_REVIEWING", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { admin, supervisor, user } = await createTestUsers();
  const account = await createSupervisorAccount(supervisor.id, "MS-001", "Multi Account");

  const request = await createTestRequest(user.id, "REIMBURSEMENT", "SUPERVISOR_APPROVED");
  await createApproval(request.id, supervisor.id, "APPROVE", "SUPERVISOR", account.id);

  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: { email: admin.email, password: admin.password },
  });
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));

  const response = await makeRequest(API_BASE, {
    method: "POST",
    path: `/requests/${request.id}/finance-approve`,
    cookieHeader: cookies.cookieHeader,
    body: { comment: "First approval" },
  });

  assertEquals(response.status, 200);
  assertEquals(response.body.request.status, "FINANCE_REVIEWING");
});

Deno.test({ name: "Multi-signoff: second approval keeps FINANCE_REVIEWING", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { admin, admin2, supervisor, user } = await createTestUsers();
  const account = await createSupervisorAccount(supervisor.id, "MS-002", "Multi Account 2");

  const request = await createTestRequest(user.id, "REIMBURSEMENT", "FINANCE_REVIEWING");
  await createApproval(request.id, supervisor.id, "APPROVE", "SUPERVISOR", account.id);
  await createApproval(request.id, admin.id, "APPROVE", "FINANCE");

  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: { email: admin2.email, password: admin2.password },
  });
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));

  const response = await makeRequest(API_BASE, {
    method: "POST",
    path: `/requests/${request.id}/finance-approve`,
    cookieHeader: cookies.cookieHeader,
    body: { comment: "Second approval" },
  });

  assertEquals(response.status, 200);
  assertEquals(response.body.request.status, "FINANCE_REVIEWING");
});

Deno.test({ name: "Multi-signoff: third approval with classification sets FINANCE_APPROVED", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { admin, admin2, admin3, supervisor, user } = await createTestUsers();
  const account = await createSupervisorAccount(supervisor.id, "MS-003", "Multi Account 3");

  const request = await createTestRequest(user.id, "REIMBURSEMENT", "FINANCE_REVIEWING", "Third Approval", {
    reimbursement: {
      items: [
        { description: "Item A", amount: 50.0, date: new Date("2026-03-01"), codeSecondaire: "52010" },
        { description: "Item B", amount: 75.0, date: new Date("2026-03-02"), codeSecondaire: "64040" },
      ],
    },
  });
  await createApproval(request.id, supervisor.id, "APPROVE", "SUPERVISOR", account.id);
  await createApproval(request.id, admin.id, "APPROVE", "FINANCE");
  await createApproval(request.id, admin2.id, "APPROVE", "FINANCE");

  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: { email: admin3.email, password: admin3.password },
  });
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));

  const response = await makeRequest(API_BASE, {
    method: "POST",
    path: `/requests/${request.id}/finance-approve`,
    cookieHeader: cookies.cookieHeader,
    body: { comment: "Third approval" },
  });

  assertEquals(response.status, 200);
  assertEquals(response.body.request.status, "FINANCE_APPROVED");
});

Deno.test({ name: "Multi-signoff: third approval blocked when items not classified", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { admin, admin2, admin3, supervisor, user } = await createTestUsers();
  const account = await createSupervisorAccount(supervisor.id, "MS-004", "Multi Account 4");

  const request = await createTestRequest(user.id, "REIMBURSEMENT", "FINANCE_REVIEWING", "Unclclassified Third", {
    reimbursement: {
      items: [
        { description: "Item A", amount: 50.0, date: new Date("2026-03-01") },
        { description: "Item B", amount: 75.0, date: new Date("2026-03-02"), codeSecondaire: "64040" },
      ],
    },
  });
  await createApproval(request.id, supervisor.id, "APPROVE", "SUPERVISOR", account.id);
  await createApproval(request.id, admin.id, "APPROVE", "FINANCE");
  await createApproval(request.id, admin2.id, "APPROVE", "FINANCE");

  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: { email: admin3.email, password: admin3.password },
  });
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));

  const response = await makeRequest(API_BASE, {
    method: "POST",
    path: `/requests/${request.id}/finance-approve`,
    cookieHeader: cookies.cookieHeader,
    body: { comment: "Should not work" },
  });

  assertEquals(response.status, 400);
  assertExists(response.body.error);
  assert(response.body.error.includes("code secondaire"));
});

Deno.test({ name: "Multi-signoff: same admin cannot approve twice", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { admin, supervisor, user } = await createTestUsers();
  const account = await createSupervisorAccount(supervisor.id, "MS-005", "Multi Account 5");

  const request = await createTestRequest(user.id, "REIMBURSEMENT", "FINANCE_REVIEWING");
  await createApproval(request.id, supervisor.id, "APPROVE", "SUPERVISOR", account.id);
  await createApproval(request.id, admin.id, "APPROVE", "FINANCE");

  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: { email: admin.email, password: admin.password },
  });
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));

  const response = await makeRequest(API_BASE, {
    method: "POST",
    path: `/requests/${request.id}/finance-approve`,
    cookieHeader: cookies.cookieHeader,
    body: { comment: "Should not work" },
  });

  assertEquals(response.status, 400);
  assertExists(response.body.error);
  assert(response.body.error.includes("already"));
});

Deno.test({ name: "Multi-signoff: finance reject works from FINANCE_REVIEWING", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { admin, admin2, supervisor, user } = await createTestUsers();
  const account = await createSupervisorAccount(supervisor.id, "MS-006", "Multi Account 6");

  const request = await createTestRequest(user.id, "REIMBURSEMENT", "FINANCE_REVIEWING");
  await createApproval(request.id, supervisor.id, "APPROVE", "SUPERVISOR", account.id);
  await createApproval(request.id, admin.id, "APPROVE", "FINANCE");

  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: { email: admin2.email, password: admin2.password },
  });
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));

  const response = await makeRequest(API_BASE, {
    method: "POST",
    path: `/requests/${request.id}/finance-reject`,
    cookieHeader: cookies.cookieHeader,
    body: { comment: "Rejected during review" },
  });

  assertEquals(response.status, 200);
  assertEquals(response.body.request.status, "FINANCE_REJECTED");
});

Deno.test({ name: "Multi-signoff: classify then approve succeeds", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { admin, admin2, admin3, supervisor, user } = await createTestUsers();
  const account = await createSupervisorAccount(supervisor.id, "MS-007", "Multi Account 7");

  const request = await createTestRequest(user.id, "REIMBURSEMENT", "FINANCE_REVIEWING", "Classify Then Approve", {
    reimbursement: {
      items: [
        { description: "Item A", amount: 50.0, date: new Date("2026-03-01") },
      ],
    },
  });
  await createApproval(request.id, supervisor.id, "APPROVE", "SUPERVISOR", account.id);
  await createApproval(request.id, admin.id, "APPROVE", "FINANCE");
  await createApproval(request.id, admin2.id, "APPROVE", "FINANCE");

  const items = await prisma.reimbursementItem.findMany({
    where: { detail: { requestId: request.id } },
  });

  const admin3Login = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: { email: admin3.email, password: admin3.password },
  });
  const admin3Cookies = parseSetCookie(admin3Login.headers.get("set-cookie"));

  const classifyResponse = await makeRequest(API_BASE, {
    method: "PATCH",
    path: `/requests/${request.id}/classify-item`,
    cookieHeader: admin3Cookies.cookieHeader,
    body: {
      itemId: items[0].id,
      itemType: "reimbursement",
      codeSecondaire: "52010",
    },
  });
  assertEquals(classifyResponse.status, 200);

  const approveResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: `/requests/${request.id}/finance-approve`,
    cookieHeader: admin3Cookies.cookieHeader,
    body: { comment: "Third approval after classifying" },
  });

  assertEquals(approveResponse.status, 200);
  assertEquals(approveResponse.body.request.status, "FINANCE_APPROVED");
});

Deno.test({ name: "Multi-signoff: request with no items can be fully approved", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { admin, admin2, admin3, supervisor, user } = await createTestUsers();
  const account = await createSupervisorAccount(supervisor.id, "MS-008", "No Items Account");

  const request = await createTestRequest(user.id, "REIMBURSEMENT", "SUPERVISOR_APPROVED", "No Items Request");
  await createApproval(request.id, supervisor.id, "APPROVE", "SUPERVISOR", account.id);

  const login1 = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: { email: admin.email, password: admin.password },
  });
  const cookies1 = parseSetCookie(login1.headers.get("set-cookie"));

  const r1 = await makeRequest(API_BASE, {
    method: "POST",
    path: `/requests/${request.id}/finance-approve`,
    cookieHeader: cookies1.cookieHeader,
    body: { comment: "First" },
  });
  assertEquals(r1.status, 200);
  assertEquals(r1.body.request.status, "FINANCE_REVIEWING");

  const login2 = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: { email: admin2.email, password: admin2.password },
  });
  const cookies2 = parseSetCookie(login2.headers.get("set-cookie"));

  const r2 = await makeRequest(API_BASE, {
    method: "POST",
    path: `/requests/${request.id}/finance-approve`,
    cookieHeader: cookies2.cookieHeader,
    body: { comment: "Second" },
  });
  assertEquals(r2.status, 200);
  assertEquals(r2.body.request.status, "FINANCE_REVIEWING");

  const login3 = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: { email: admin3.email, password: admin3.password },
  });
  const cookies3 = parseSetCookie(login3.headers.get("set-cookie"));

  const r3 = await makeRequest(API_BASE, {
    method: "POST",
    path: `/requests/${request.id}/finance-approve`,
    cookieHeader: cookies3.cookieHeader,
    body: { comment: "Third" },
  });
  assertEquals(r3.status, 200);
  assertEquals(r3.body.request.status, "FINANCE_APPROVED");
});

Deno.test({ name: "Multi-signoff: full workflow DRAFT -> SUBMITTED -> SUP_APPROVED -> FIN_REVIEWING -> FIN_APPROVED -> PAID with 3 admins", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { admin, admin2, admin3, supervisor, user } = await createTestUsers();
  const account = await createSupervisorAccount(supervisor.id, "FW-001", "Full Workflow Account");

  const userLogin = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: { email: user.email, password: user.password },
  });
  const userCookies = parseSetCookie(userLogin.headers.get("set-cookie"));

  const supLogin = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: { email: supervisor.email, password: supervisor.password },
  });
  const supCookies = parseSetCookie(supLogin.headers.get("set-cookie"));

  const admin1Login = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: { email: admin.email, password: admin.password },
  });
  const admin1Cookies = parseSetCookie(admin1Login.headers.get("set-cookie"));

  const admin2Login = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: { email: admin2.email, password: admin2.password },
  });
  const admin2Cookies = parseSetCookie(admin2Login.headers.get("set-cookie"));

  const admin3Login = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: { email: admin3.email, password: admin3.password },
  });
  const admin3Cookies = parseSetCookie(admin3Login.headers.get("set-cookie"));

  let response = await makeRequest(API_BASE, {
    method: "POST",
    path: "/requests",
    cookieHeader: userCookies.cookieHeader,
    body: { type: "REIMBURSEMENT", title: "Full Multi-Signoff Workflow" },
  });
  assertEquals(response.status, 201);
  const requestId = response.body.request.id;

  response = await makeRequest(API_BASE, {
    method: "PATCH",
    path: `/requests/${requestId}`,
    cookieHeader: userCookies.cookieHeader,
    body: {
      reimbursement: {
        items: [
          { description: "Widget A", amount: 100.0, date: "2026-03-01T00:00:00Z" },
          { description: "Widget B", amount: 200.0, date: "2026-03-02T00:00:00Z" },
        ],
      },
    },
  });
  assertEquals(response.status, 200);

  response = await makeRequest(API_BASE, {
    method: "POST",
    path: `/requests/${requestId}/submit`,
    cookieHeader: userCookies.cookieHeader,
  });
  assertEquals(response.status, 200);
  assertEquals(response.body.request.status, "SUBMITTED");

  response = await makeRequest(API_BASE, {
    method: "POST",
    path: `/requests/${requestId}/supervisor-approve`,
    cookieHeader: supCookies.cookieHeader,
    body: { accountId: account.id, comment: "Approved" },
  });
  assertEquals(response.status, 200);
  assertEquals(response.body.request.status, "SUPERVISOR_APPROVED");

  const items = await prisma.reimbursementItem.findMany({
    where: { detail: { requestId } },
  });

  await makeRequest(API_BASE, {
    method: "PATCH",
    path: `/requests/${requestId}/classify-item`,
    cookieHeader: admin1Cookies.cookieHeader,
    body: { itemId: items[0].id, itemType: "reimbursement", codeSecondaire: "52010" },
  });
  await makeRequest(API_BASE, {
    method: "PATCH",
    path: `/requests/${requestId}/classify-item`,
    cookieHeader: admin1Cookies.cookieHeader,
    body: { itemId: items[1].id, itemType: "reimbursement", codeSecondaire: "64040" },
  });

  response = await makeRequest(API_BASE, {
    method: "POST",
    path: `/requests/${requestId}/finance-approve`,
    cookieHeader: admin1Cookies.cookieHeader,
    body: { comment: "First" },
  });
  assertEquals(response.status, 200);
  assertEquals(response.body.request.status, "FINANCE_REVIEWING");

  response = await makeRequest(API_BASE, {
    method: "POST",
    path: `/requests/${requestId}/finance-approve`,
    cookieHeader: admin2Cookies.cookieHeader,
    body: { comment: "Second" },
  });
  assertEquals(response.status, 200);
  assertEquals(response.body.request.status, "FINANCE_REVIEWING");

  response = await makeRequest(API_BASE, {
    method: "POST",
    path: `/requests/${requestId}/finance-approve`,
    cookieHeader: admin3Cookies.cookieHeader,
    body: { comment: "Third" },
  });
  assertEquals(response.status, 200);
  assertEquals(response.body.request.status, "FINANCE_APPROVED");

  response = await makeRequest(API_BASE, {
    method: "POST",
    path: `/requests/${requestId}/mark-paid`,
    cookieHeader: admin1Cookies.cookieHeader,
    body: { comment: "Paid" },
  });
  assertEquals(response.status, 200);
  assertEquals(response.body.request.status, "PAID");

  response = await makeRequest(API_BASE, {
    method: "GET",
    path: `/requests/${requestId}`,
    cookieHeader: admin1Cookies.cookieHeader,
  });
  assertEquals(response.status, 200);
  assertEquals(response.body.request.status, "PAID");

  const financeApprovals = response.body.request.approvals.filter(
    (a: { stage: string; action: string }) => a.stage === "FINANCE" && a.action === "APPROVE",
  );
  assertEquals(financeApprovals.length, 3);

  const distinctActors = new Set(financeApprovals.map((a: { actorId: string }) => a.actorId));
  assertEquals(distinctActors.size, 3);
});

Deno.test({ name: "Multi-signoff: concurrent approvers serialize on the request row", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { admin, admin2, admin3, supervisor, user } = await createTestUsers();
  const account = await createSupervisorAccount(supervisor.id, "RACE-001", "Race Account");

  // No items so the final-signoff classification gate is satisfied trivially.
  const request = await createTestRequest(user.id, "REIMBURSEMENT", "SUPERVISOR_APPROVED", "Concurrent Approvals");
  await createApproval(request.id, supervisor.id, "APPROVE", "SUPERVISOR", account.id);

  const [login1, login2, login3] = await Promise.all([
    makeRequest(API_BASE, { method: "POST", path: "/auth/login", body: { email: admin.email, password: admin.password } }),
    makeRequest(API_BASE, { method: "POST", path: "/auth/login", body: { email: admin2.email, password: admin2.password } }),
    makeRequest(API_BASE, { method: "POST", path: "/auth/login", body: { email: admin3.email, password: admin3.password } }),
  ]);
  const cookies1 = parseSetCookie(login1.headers.get("set-cookie"));
  const cookies2 = parseSetCookie(login2.headers.get("set-cookie"));
  const cookies3 = parseSetCookie(login3.headers.get("set-cookie"));

  // Fire three approvals concurrently. Without row-level locking on Request,
  // all three would observe count = 0 and write FINANCE_REVIEWING, leaving
  // the request stuck below the required threshold despite holding all signoffs.
  const responses = await Promise.all([
    makeRequest(API_BASE, {
      method: "POST",
      path: `/requests/${request.id}/finance-approve`,
      cookieHeader: cookies1.cookieHeader,
      body: { comment: "Concurrent 1" },
    }),
    makeRequest(API_BASE, {
      method: "POST",
      path: `/requests/${request.id}/finance-approve`,
      cookieHeader: cookies2.cookieHeader,
      body: { comment: "Concurrent 2" },
    }),
    makeRequest(API_BASE, {
      method: "POST",
      path: `/requests/${request.id}/finance-approve`,
      cookieHeader: cookies3.cookieHeader,
      body: { comment: "Concurrent 3" },
    }),
  ]);

  for (const r of responses) {
    assertEquals(r.status, 200);
  }

  const finalRequest = await prisma.request.findUnique({
    where: { id: request.id },
    include: { approvals: { where: { stage: "FINANCE", action: "APPROVE" } } },
  });
  assertEquals(finalRequest!.status, "FINANCE_APPROVED");
  assertEquals(finalRequest!.approvals.length, 3);
  const distinctActors = new Set(finalRequest!.approvals.map((a) => a.actorId));
  assertEquals(distinctActors.size, 3);
});
