import { assertEquals, assertExists, assert } from "jsr:@std/assert";
import { cleanupDatabase, createTestUsers, createTestRequest, createApproval, makeRequest, parseSetCookie, createSupervisorAccount } from "./test-utils.ts";

const API_BASE = "http://localhost:8000/api";

Deno.test({ name: "Approvals: POST /api/requests/:id/supervisor-approve - approve submitted request", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { admin, user, supervisor } = await createTestUsers();
  const account = await createSupervisorAccount(supervisor.id, "1001", "Test Account");

  const request = await createTestRequest(user.id, "REIMBURSEMENT", "SUBMITTED");

  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: {
      email: supervisor.email,
      password: supervisor.password,
    },
  });

  assertEquals(loginResponse.status, 200);
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));

  const response = await makeRequest(API_BASE, {
    method: "POST",
    path: `/requests/${request.id}/supervisor-approve`,
    cookieHeader: cookies.cookieHeader,
    body: {
      accountId: account.id,
      comment: "Approved for testing",
    },
  });

  assertEquals(response.status, 200);
  assertExists(response.body.request);
  assertEquals(response.body.request.status, "SUPERVISOR_APPROVED");
});

Deno.test({ name: "Approvals: POST /api/requests/:id/supervisor-approve - financial admin can approve", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { admin, user, supervisor } = await createTestUsers();

  const account = await createSupervisorAccount(admin.id, "1002", "Admin Account");
  const request = await createTestRequest(user.id, "REIMBURSEMENT", "SUBMITTED");

  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: {
      email: admin.email,
      password: admin.password,
    },
  });

  assertEquals(loginResponse.status, 200);
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));

  const response = await makeRequest(API_BASE, {
    method: "POST",
    path: `/requests/${request.id}/supervisor-approve`,
    cookieHeader: cookies.cookieHeader,
    body: {
      accountId: account.id,
      comment: "Admin approval",
    },
  });

  assertEquals(response.status, 200);
  assertExists(response.body.request);
  assertEquals(response.body.request.status, "SUPERVISOR_APPROVED");
});

Deno.test({ name: "Approvals: POST /api/requests/:id/supervisor-approve - missing accountId", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { user, supervisor } = await createTestUsers();
  const request = await createTestRequest(user.id, "REIMBURSEMENT", "SUBMITTED");

  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: {
      email: supervisor.email,
      password: supervisor.password,
    },
  });

  assertEquals(loginResponse.status, 200);
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));

  const response = await makeRequest(API_BASE, {
    method: "POST",
    path: `/requests/${request.id}/supervisor-approve`,
    cookieHeader: cookies.cookieHeader,
    body: {
      comment: "Approving without account",
    },
  });

  assertEquals(response.status, 422);
  assertExists(response.body.error);
});

Deno.test({ name: "Approvals: POST /api/requests/:id/supervisor-approve - invalid accountId", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { user, supervisor } = await createTestUsers();
  const request = await createTestRequest(user.id, "REIMBURSEMENT", "SUBMITTED");

  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: {
      email: supervisor.email,
      password: supervisor.password,
    },
  });

  assertEquals(loginResponse.status, 200);
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));

  const response = await makeRequest(API_BASE, {
    method: "POST",
    path: `/requests/${request.id}/supervisor-approve`,
    cookieHeader: cookies.cookieHeader,
    body: {
      accountId: "invalid-uuid",
      comment: "Invalid account",
    },
  });

  assertEquals(response.status, 422);
  assertExists(response.body.error);
});

Deno.test({ name: "Approvals: POST /api/requests/:id/supervisor-approve - inactive account rejected", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { user, supervisor, admin } = await createTestUsers();
  const account = await createSupervisorAccount(supervisor.id, "INACTIVE-001", "Inactive Account");

  // Deactivate the account
  const adminLogin = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: { email: admin.email, password: admin.password },
  });
  const adminCookies = parseSetCookie(adminLogin.headers.get("set-cookie"));
  await makeRequest(API_BASE, {
    method: "DELETE",
    path: `/supervisors/${supervisor.id}/accounts/${account.id}`,
    cookieHeader: adminCookies.cookieHeader,
  });

  const request = await createTestRequest(user.id, "REIMBURSEMENT", "SUBMITTED");

  const supLogin = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: { email: supervisor.email, password: supervisor.password },
  });
  const supCookies = parseSetCookie(supLogin.headers.get("set-cookie"));

  const response = await makeRequest(API_BASE, {
    method: "POST",
    path: `/requests/${request.id}/supervisor-approve`,
    cookieHeader: supCookies.cookieHeader,
    body: { accountId: account.id },
  });

  assertEquals(response.status, 400);
  assertExists(response.body.error);
});

Deno.test({ name: "Approvals: POST /api/requests/:id/supervisor-approve - unauthenticated", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { user, supervisor } = await createTestUsers();
  const account = await createSupervisorAccount(supervisor.id, "1001", "Test Account");
  const request = await createTestRequest(user.id, "REIMBURSEMENT", "SUBMITTED");

  const response = await makeRequest(API_BASE, {
    method: "POST",
    path: `/requests/${request.id}/supervisor-approve`,
    body: {
      accountId: account.id,
    },
  });

  assertEquals(response.status, 401);
  assertExists(response.body.error);
});

Deno.test({ name: "Approvals: POST /api/requests/:id/supervisor-approve - not supervisor or admin", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { user, supervisor } = await createTestUsers();
  const account = await createSupervisorAccount(supervisor.id, "1001", "Test Account");
  const request = await createTestRequest(user.id, "REIMBURSEMENT", "SUBMITTED");

  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: {
      email: user.email,
      password: user.password,
    },
  });

  assertEquals(loginResponse.status, 200);
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));

  const response = await makeRequest(API_BASE, {
    method: "POST",
    path: `/requests/${request.id}/supervisor-approve`,
    cookieHeader: cookies.cookieHeader,
    body: {
      accountId: account.id,
      comment: "Should not work",
    },
  });

  assertEquals(response.status, 403);
  assertExists(response.body.error);
});

Deno.test({ name: "Approvals: POST /api/requests/:id/supervisor-reject - reject submitted request", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { user, supervisor } = await createTestUsers();
  const request = await createTestRequest(user.id, "REIMBURSEMENT", "SUBMITTED");

  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: {
      email: supervisor.email,
      password: supervisor.password,
    },
  });

  assertEquals(loginResponse.status, 200);
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));

  const response = await makeRequest(API_BASE, {
    method: "POST",
    path: `/requests/${request.id}/supervisor-reject`,
    cookieHeader: cookies.cookieHeader,
    body: {
      comment: "Insufficient documentation",
    },
  });

  assertEquals(response.status, 200);
  assertExists(response.body.request);

  const getRequestResponse = await makeRequest(API_BASE, {
    method: "GET",
    path: `/requests/${request.id}`,
    cookieHeader: cookies.cookieHeader,
  });

  assertEquals(getRequestResponse.status, 200);
  assertEquals(getRequestResponse.body.request.status, "SUPERVISOR_REJECTED");
});

Deno.test({ name: "Approvals: POST /api/requests/:id/supervisor-reject - financial admin can reject", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { admin, user } = await createTestUsers();
  const request = await createTestRequest(user.id, "REIMBURSEMENT", "SUBMITTED");

  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: {
      email: admin.email,
      password: admin.password,
    },
  });

  assertEquals(loginResponse.status, 200);
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));

  const response = await makeRequest(API_BASE, {
    method: "POST",
    path: `/requests/${request.id}/supervisor-reject`,
    cookieHeader: cookies.cookieHeader,
    body: {
      comment: "Admin rejection",
    },
  });

  assertEquals(response.status, 200);
  assertExists(response.body.request);

  const getRequestResponse = await makeRequest(API_BASE, {
    method: "GET",
    path: `/requests/${request.id}`,
    cookieHeader: cookies.cookieHeader,
  });

  assertEquals(getRequestResponse.status, 200);
  assertEquals(getRequestResponse.body.request.status, "SUPERVISOR_REJECTED");
});

Deno.test({ name: "Approvals: POST /api/requests/:id/supervisor-reject - unauthenticated", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { user, supervisor } = await createTestUsers();
  const request = await createTestRequest(user.id, "REIMBURSEMENT", "SUBMITTED");

  const response = await makeRequest(API_BASE, {
    method: "POST",
    path: `/requests/${request.id}/supervisor-reject`,
    body: {
      comment: "Should not work",
    },
  });

  assertEquals(response.status, 401);
  assertExists(response.body.error);
});

Deno.test({ name: "Approvals: POST /api/requests/:id/supervisor-reject - not supervisor or admin", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { user, supervisor } = await createTestUsers();
  const request = await createTestRequest(user.id, "REIMBURSEMENT", "SUBMITTED");

  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: {
      email: user.email,
      password: user.password,
    },
  });

  assertEquals(loginResponse.status, 200);
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));

  const response = await makeRequest(API_BASE, {
    method: "POST",
    path: `/requests/${request.id}/supervisor-reject`,
    cookieHeader: cookies.cookieHeader,
    body: {
      comment: "Should not work",
    },
  });

  assertEquals(response.status, 403);
  assertExists(response.body.error);
});

Deno.test({ name: "Approvals: POST /api/requests/:id/supervisor-reject - cannot reject non-submitted", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { user, supervisor } = await createTestUsers();
  const request = await createTestRequest(user.id, "REIMBURSEMENT", "DRAFT");

  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: { email: supervisor.email, password: supervisor.password },
  });
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));

  const response = await makeRequest(API_BASE, {
    method: "POST",
    path: `/requests/${request.id}/supervisor-reject`,
    cookieHeader: cookies.cookieHeader,
    body: { comment: "Should not work" },
  });

  assertEquals(response.status, 400);
  assertExists(response.body.error);
});

Deno.test({ name: "Approvals: POST /api/requests/:id/finance-approve - approve supervisor approved request", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { admin, user, supervisor } = await createTestUsers();
  const account = await createSupervisorAccount(supervisor.id, "1001", "Test Account");

  const request = await createTestRequest(user.id, "REIMBURSEMENT", "SUPERVISOR_APPROVED");
  await createApproval(request.id, supervisor.id, "APPROVE", "SUPERVISOR", account.id);

  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: {
      email: admin.email,
      password: admin.password,
    },
  });

  assertEquals(loginResponse.status, 200);
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));

  const response = await makeRequest(API_BASE, {
    method: "POST",
    path: `/requests/${request.id}/finance-approve`,
    cookieHeader: cookies.cookieHeader,
    body: {
      comment: "Finance approved",
    },
  });

  assertEquals(response.status, 200);
  assertExists(response.body.request);

  const getRequestResponse = await makeRequest(API_BASE, {
    method: "GET",
    path: `/requests/${request.id}`,
    cookieHeader: cookies.cookieHeader,
  });

  assertEquals(getRequestResponse.status, 200);
  assertEquals(getRequestResponse.body.request.status, "FINANCE_APPROVED");
});

Deno.test({ name: "Approvals: POST /api/requests/:id/finance-approve - unauthenticated", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { admin, user, supervisor } = await createTestUsers();
  const account = await createSupervisorAccount(supervisor.id, "1001", "Test Account");
  const request = await createTestRequest(user.id, "REIMBURSEMENT", "SUPERVISOR_APPROVED");
  await createApproval(request.id, supervisor.id, "APPROVE", "SUPERVISOR", account.id);

  const response = await makeRequest(API_BASE, {
    method: "POST",
    path: `/requests/${request.id}/finance-approve`,
    body: {
      comment: "Should not work",
    },
  });

  assertEquals(response.status, 401);
  assertExists(response.body.error);
});

Deno.test({ name: "Approvals: POST /api/requests/:id/finance-approve - not financial admin", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { admin, user, supervisor } = await createTestUsers();
  const account = await createSupervisorAccount(supervisor.id, "1001", "Test Account");
  const request = await createTestRequest(user.id, "REIMBURSEMENT", "SUPERVISOR_APPROVED");
  await createApproval(request.id, supervisor.id, "APPROVE", "SUPERVISOR", account.id);

  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: {
      email: user.email,
      password: user.password,
    },
  });

  assertEquals(loginResponse.status, 200);
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));

  const response = await makeRequest(API_BASE, {
    method: "POST",
    path: `/requests/${request.id}/finance-approve`,
    cookieHeader: cookies.cookieHeader,
    body: {
      comment: "Should not work",
    },
  });

  assertEquals(response.status, 403);
  assertExists(response.body.error);
});

Deno.test({ name: "Approvals: POST /api/requests/:id/finance-reject - reject supervisor approved request", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { admin, user, supervisor } = await createTestUsers();
  const account = await createSupervisorAccount(supervisor.id, "1001", "Test Account");

  const request = await createTestRequest(user.id, "REIMBURSEMENT", "SUPERVISOR_APPROVED");
  await createApproval(request.id, supervisor.id, "APPROVE", "SUPERVISOR", account.id);

  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: {
      email: admin.email,
      password: admin.password,
    },
  });

  assertEquals(loginResponse.status, 200);
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));

  const response = await makeRequest(API_BASE, {
    method: "POST",
    path: `/requests/${request.id}/finance-reject`,
    cookieHeader: cookies.cookieHeader,
    body: {
      comment: "Budget exceeded",
    },
  });

  assertEquals(response.status, 200);
  assertExists(response.body.request);

  const getRequestResponse = await makeRequest(API_BASE, {
    method: "GET",
    path: `/requests/${request.id}`,
    cookieHeader: cookies.cookieHeader,
  });

  assertEquals(getRequestResponse.status, 200);
  assertEquals(getRequestResponse.body.request.status, "FINANCE_REJECTED");
});

Deno.test({ name: "Approvals: POST /api/requests/:id/finance-reject - unauthenticated", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { admin, user, supervisor } = await createTestUsers();
  const account = await createSupervisorAccount(supervisor.id, "1001", "Test Account");
  const request = await createTestRequest(user.id, "REIMBURSEMENT", "SUPERVISOR_APPROVED");
  await createApproval(request.id, supervisor.id, "APPROVE", "SUPERVISOR", account.id);

  const response = await makeRequest(API_BASE, {
    method: "POST",
    path: `/requests/${request.id}/finance-reject`,
    body: {
      comment: "Should not work",
    },
  });

  assertEquals(response.status, 401);
  assertExists(response.body.error);
});

Deno.test({ name: "Approvals: POST /api/requests/:id/finance-reject - not financial admin", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { admin, user, supervisor } = await createTestUsers();
  const account = await createSupervisorAccount(supervisor.id, "1001", "Test Account");
  const request = await createTestRequest(user.id, "REIMBURSEMENT", "SUPERVISOR_APPROVED");
  await createApproval(request.id, supervisor.id, "APPROVE", "SUPERVISOR", account.id);

  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: {
      email: user.email,
      password: user.password,
    },
  });

  assertEquals(loginResponse.status, 200);
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));

  const response = await makeRequest(API_BASE, {
    method: "POST",
    path: `/requests/${request.id}/finance-reject`,
    cookieHeader: cookies.cookieHeader,
    body: {
      comment: "Should not work",
    },
  });

  assertEquals(response.status, 403);
  assertExists(response.body.error);
});

Deno.test({ name: "Approvals: POST /api/requests/:id/finance-reject - cannot reject non-supervisor-approved", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { admin, user } = await createTestUsers();
  const request = await createTestRequest(user.id, "REIMBURSEMENT", "SUBMITTED");

  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: { email: admin.email, password: admin.password },
  });
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));

  const response = await makeRequest(API_BASE, {
    method: "POST",
    path: `/requests/${request.id}/finance-reject`,
    cookieHeader: cookies.cookieHeader,
    body: { comment: "Should not work" },
  });

  assertEquals(response.status, 400);
  assertExists(response.body.error);
});

Deno.test({ name: "Approvals: POST /api/requests/:id/mark-paid - mark finance approved as paid", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { admin, user, supervisor } = await createTestUsers();
  const account = await createSupervisorAccount(supervisor.id, "1001", "Test Account");

  const request = await createTestRequest(user.id, "REIMBURSEMENT", "FINANCE_APPROVED");
  await createApproval(request.id, supervisor.id, "APPROVE", "SUPERVISOR", account.id);
  await createApproval(request.id, admin.id, "APPROVE", "FINANCE");

  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: {
      email: admin.email,
      password: admin.password,
    },
  });

  assertEquals(loginResponse.status, 200);
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));

  const response = await makeRequest(API_BASE, {
    method: "POST",
    path: `/requests/${request.id}/mark-paid`,
    cookieHeader: cookies.cookieHeader,
    body: {
      comment: "Payment processed",
    },
  });

  assertEquals(response.status, 200);
  assertExists(response.body.request);

  const getRequestResponse = await makeRequest(API_BASE, {
    method: "GET",
    path: `/requests/${request.id}`,
    cookieHeader: cookies.cookieHeader,
  });

  assertEquals(getRequestResponse.status, 200);
  assertEquals(getRequestResponse.body.request.status, "PAID");
});

Deno.test({ name: "Approvals: POST /api/requests/:id/mark-paid - cannot mark non-finance-approved as paid", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { admin, user } = await createTestUsers();
  const request = await createTestRequest(user.id, "REIMBURSEMENT", "SUPERVISOR_APPROVED");

  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: { email: admin.email, password: admin.password },
  });
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));

  const response = await makeRequest(API_BASE, {
    method: "POST",
    path: `/requests/${request.id}/mark-paid`,
    cookieHeader: cookies.cookieHeader,
    body: { comment: "Should not work" },
  });

  assertEquals(response.status, 400);
  assertExists(response.body.error);
});

Deno.test({ name: "Approvals: POST /api/requests/:id/mark-paid - unauthenticated", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { admin, user, supervisor } = await createTestUsers();
  const account = await createSupervisorAccount(supervisor.id, "1001", "Test Account");
  const request = await createTestRequest(user.id, "REIMBURSEMENT", "FINANCE_APPROVED");
  await createApproval(request.id, supervisor.id, "APPROVE", "SUPERVISOR", account.id);
  await createApproval(request.id, admin.id, "APPROVE", "FINANCE");

  const response = await makeRequest(API_BASE, {
    method: "POST",
    path: `/requests/${request.id}/mark-paid`,
    body: {
      comment: "Should not work",
    },
  });

  assertEquals(response.status, 401);
  assertExists(response.body.error);
});

Deno.test({ name: "Approvals: POST /api/requests/:id/mark-paid - not financial admin", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { admin, user, supervisor } = await createTestUsers();
  const account = await createSupervisorAccount(supervisor.id, "1001", "Test Account");
  const request = await createTestRequest(user.id, "REIMBURSEMENT", "FINANCE_APPROVED");
  await createApproval(request.id, supervisor.id, "APPROVE", "SUPERVISOR", account.id);
  await createApproval(request.id, admin.id, "APPROVE", "FINANCE");

  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: {
      email: user.email,
      password: user.password,
    },
  });

  assertEquals(loginResponse.status, 200);
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));

  const response = await makeRequest(API_BASE, {
    method: "POST",
    path: `/requests/${request.id}/mark-paid`,
    cookieHeader: cookies.cookieHeader,
    body: {
      comment: "Should not work",
    },
  });

  assertEquals(response.status, 403);
  assertExists(response.body.error);
});

Deno.test({ name: "Approvals: cannot approve non-submitted request", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { user, supervisor } = await createTestUsers();
  const account = await createSupervisorAccount(supervisor.id, "1001", "Test Account");

  const request = await createTestRequest(user.id, "REIMBURSEMENT", "DRAFT");

  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: {
      email: supervisor.email,
      password: supervisor.password,
    },
  });

  assertEquals(loginResponse.status, 200);
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));

  const response = await makeRequest(API_BASE, {
    method: "POST",
    path: `/requests/${request.id}/supervisor-approve`,
    cookieHeader: cookies.cookieHeader,
    body: {
      accountId: account.id,
      comment: "Should not work",
    },
  });

  assertEquals(response.status, 400);
  assertExists(response.body.error);
});

Deno.test({ name: "Approvals: cannot finance approve non-supervisor approved request", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { admin, user, supervisor } = await createTestUsers();
  const account = await createSupervisorAccount(supervisor.id, "1001", "Test Account");

  const request = await createTestRequest(user.id, "REIMBURSEMENT", "SUBMITTED");

  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: {
      email: admin.email,
      password: admin.password,
    },
  });

  assertEquals(loginResponse.status, 200);
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));

  const response = await makeRequest(API_BASE, {
    method: "POST",
    path: `/requests/${request.id}/finance-approve`,
    cookieHeader: cookies.cookieHeader,
    body: {
      comment: "Should not work",
    },
  });

  assertEquals(response.status, 400);
  assertExists(response.body.error);
});

Deno.test({ name: "Approvals: full workflow DRAFT -> SUBMITTED -> SUP_APPROVED -> FIN_APPROVED -> PAID", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { admin, user, supervisor } = await createTestUsers();
  const account = await createSupervisorAccount(supervisor.id, "WF-001", "Workflow Account");

  // Login all users
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

  const adminLogin = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: { email: admin.email, password: admin.password },
  });
  const adminCookies = parseSetCookie(adminLogin.headers.get("set-cookie"));

  // 1. Create request
  let response = await makeRequest(API_BASE, {
    method: "POST",
    path: "/requests",
    cookieHeader: userCookies.cookieHeader,
    body: { type: "REIMBURSEMENT", title: "Full Workflow Test" },
  });
  assertEquals(response.status, 201);
  const requestId = response.body.request.id;

  // 2. Submit
  response = await makeRequest(API_BASE, {
    method: "POST",
    path: `/requests/${requestId}/submit`,
    cookieHeader: userCookies.cookieHeader,
  });
  assertEquals(response.status, 200);
  assertEquals(response.body.request.status, "SUBMITTED");

  // 3. Supervisor approve
  response = await makeRequest(API_BASE, {
    method: "POST",
    path: `/requests/${requestId}/supervisor-approve`,
    cookieHeader: supCookies.cookieHeader,
    body: { accountId: account.id, comment: "Looks good" },
  });
  assertEquals(response.status, 200);
  assertEquals(response.body.request.status, "SUPERVISOR_APPROVED");

  // 4. Finance approve
  response = await makeRequest(API_BASE, {
    method: "POST",
    path: `/requests/${requestId}/finance-approve`,
    cookieHeader: adminCookies.cookieHeader,
    body: { comment: "Approved by finance" },
  });
  assertEquals(response.status, 200);

  // 5. Mark paid
  response = await makeRequest(API_BASE, {
    method: "POST",
    path: `/requests/${requestId}/mark-paid`,
    cookieHeader: adminCookies.cookieHeader,
    body: { comment: "Payment sent" },
  });
  assertEquals(response.status, 200);

  // Verify final state
  response = await makeRequest(API_BASE, {
    method: "GET",
    path: `/requests/${requestId}`,
    cookieHeader: adminCookies.cookieHeader,
  });
  assertEquals(response.status, 200);
  assertEquals(response.body.request.status, "PAID");
  // Should have 3 approval records
  assertEquals(response.body.request.approvals.length, 3);
});
