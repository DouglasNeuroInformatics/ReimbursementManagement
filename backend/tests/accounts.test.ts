import { assertEquals, assertExists } from "jsr:@std/assert";
import { cleanupDatabase, createTestUsers, createTestUser, createSupervisorAccount, makeRequest, parseSetCookie, delay } from "./test-utils.ts";

const API_BASE = "http://localhost:8000/api";

Deno.test({ name: "Accounts: GET /api/supervisors/:id/accounts - access control", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { admin, supervisor, user } = await createTestUsers();

  // 1. User cannot access
  const userLogin = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: { email: user.email, password: user.password },
  });
  let cookies = parseSetCookie(userLogin.headers.get("set-cookie"));
  let response = await makeRequest(API_BASE, {
    method: "GET",
    path: `/supervisors/${supervisor.id}/accounts`,
    cookieHeader: cookies.cookieHeader,
  });
  assertEquals(response.status, 403);

  // 2. Supervisor cannot access this (only their 'mine' endpoint!)
  const supLogin = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: { email: supervisor.email, password: supervisor.password },
  });
  cookies = parseSetCookie(supLogin.headers.get("set-cookie"));
  response = await makeRequest(API_BASE, {
    method: "GET",
    path: `/supervisors/${supervisor.id}/accounts`,
    cookieHeader: cookies.cookieHeader,
  });
  assertEquals(response.status, 403);

  // 3. Admin CAN access
  const adminLogin = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: { email: admin.email, password: admin.password },
  });
  cookies = parseSetCookie(adminLogin.headers.get("set-cookie"));
  response = await makeRequest(API_BASE, {
    method: "GET",
    path: `/supervisors/${supervisor.id}/accounts`,
    cookieHeader: cookies.cookieHeader,
  });
  assertEquals(response.status, 200);
  assertEquals(Array.isArray(response.body.accounts), true);
});

Deno.test({ name: "Accounts: CRUD operations by FINANCIAL_ADMIN", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { admin, supervisor } = await createTestUsers();

  const adminLogin = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: { email: admin.email, password: admin.password },
  });
  const cookies = parseSetCookie(adminLogin.headers.get("set-cookie"));

  // Create account
  let response = await makeRequest(API_BASE, {
    method: "POST",
    path: `/supervisors/${supervisor.id}/accounts`,
    cookieHeader: cookies.cookieHeader,
    body: {
      accountNumber: "999-0001",
      label: "Test Budget",
    },
  });
  assertEquals(response.status, 201);
  assertExists(response.body.account);
  const accountId = response.body.account.id;
  assertEquals(response.body.account.accountNumber, "999-0001");
  assertEquals(response.body.account.label, "Test Budget");
  assertEquals(response.body.account.isActive, true);

  // Update account
  response = await makeRequest(API_BASE, {
    method: "PATCH",
    path: `/supervisors/${supervisor.id}/accounts/${accountId}`,
    cookieHeader: cookies.cookieHeader,
    body: {
      label: "Updated Budget",
      isActive: false,
    },
  });
  assertEquals(response.status, 200);
  assertEquals(response.body.account.label, "Updated Budget");
  assertEquals(response.body.account.isActive, false);

  // Read accounts list
  response = await makeRequest(API_BASE, {
    method: "GET",
    path: `/supervisors/${supervisor.id}/accounts`,
    cookieHeader: cookies.cookieHeader,
  });
  assertEquals(response.status, 200);
  const found = response.body.accounts.find((a: any) => a.id === accountId);
  assertExists(found);
  assertEquals(found.label, "Updated Budget");

  // Disable account (DELETE marks as inactive)
  response = await makeRequest(API_BASE, {
    method: "DELETE",
    path: `/supervisors/${supervisor.id}/accounts/${accountId}`,
    cookieHeader: cookies.cookieHeader,
  });
  assertEquals(response.status, 200);

  // Verify deletion
  response = await makeRequest(API_BASE, {
    method: "GET",
    path: `/supervisors/${supervisor.id}/accounts`,
    cookieHeader: cookies.cookieHeader,
  });
  assertEquals(response.status, 200);
  const stillExists = response.body.accounts.find((a: any) => a.id === accountId);
  assertEquals(stillExists.isActive, false);
});

Deno.test({ name: "Accounts: GET /api/supervisors/:id/accounts/mine - supervisor gets own active accounts", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { admin, supervisor } = await createTestUsers();

  // Create accounts (one active, one inactive)
  const acct1 = await createSupervisorAccount(supervisor.id, "ACCT-001", "Active Budget");
  await createSupervisorAccount(supervisor.id, "ACCT-002", "Another Budget");

  // Admin deactivates one
  const adminLogin = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: { email: admin.email, password: admin.password },
  });
  const adminCookies = parseSetCookie(adminLogin.headers.get("set-cookie"));
  await makeRequest(API_BASE, {
    method: "PATCH",
    path: `/supervisors/${supervisor.id}/accounts/${acct1.id}`,
    cookieHeader: adminCookies.cookieHeader,
    body: { isActive: false },
  });

  // Supervisor accesses their own active accounts
  const supLogin = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: { email: supervisor.email, password: supervisor.password },
  });
  const supCookies = parseSetCookie(supLogin.headers.get("set-cookie"));

  const response = await makeRequest(API_BASE, {
    method: "GET",
    path: `/supervisors/${supervisor.id}/accounts/mine`,
    cookieHeader: supCookies.cookieHeader,
  });

  assertEquals(response.status, 200);
  assertExists(response.body.accounts);
  // Only the active account should be returned
  assertEquals(response.body.accounts.length, 1);
  assertEquals(response.body.accounts[0].accountNumber, "ACCT-002");
});

Deno.test({ name: "Accounts: GET /api/supervisors/:id/accounts/mine - cannot access another supervisor's accounts", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { admin, supervisor } = await createTestUsers();

  await createSupervisorAccount(admin.id, "ADMIN-001", "Admin Budget");

  const supLogin = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: { email: supervisor.email, password: supervisor.password },
  });
  const cookies = parseSetCookie(supLogin.headers.get("set-cookie"));

  // Supervisor tries to access admin's accounts via /mine
  const response = await makeRequest(API_BASE, {
    method: "GET",
    path: `/supervisors/${admin.id}/accounts/mine`,
    cookieHeader: cookies.cookieHeader,
  });

  assertEquals(response.status, 403);
});

Deno.test({ name: "Accounts: POST - duplicate account number returns 409", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  await delay(500);
  const { admin, supervisor } = await createTestUsers();

  await createSupervisorAccount(supervisor.id, "DUP-001", "First Budget");

  const adminLogin = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: { email: admin.email, password: admin.password },
  });
  const cookies = parseSetCookie(adminLogin.headers.get("set-cookie"));

  const response = await makeRequest(API_BASE, {
    method: "POST",
    path: `/supervisors/${supervisor.id}/accounts`,
    cookieHeader: cookies.cookieHeader,
    body: {
      accountNumber: "DUP-001",
      label: "Duplicate Budget",
    },
  });

  assertEquals(response.status, 409);
  assertExists(response.body.error);
});

Deno.test({ name: "Accounts: POST - reactivates deactivated account with same number", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  await delay(500);
  const { admin, supervisor } = await createTestUsers();

  const adminLogin = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: { email: admin.email, password: admin.password },
  });
  const cookies = parseSetCookie(adminLogin.headers.get("set-cookie"));

  // Create and deactivate an account
  let response = await makeRequest(API_BASE, {
    method: "POST",
    path: `/supervisors/${supervisor.id}/accounts`,
    cookieHeader: cookies.cookieHeader,
    body: { accountNumber: "REACTIVATE-001", label: "Old Label" },
  });
  assertEquals(response.status, 201);
  const accountId = response.body.account.id;

  await makeRequest(API_BASE, {
    method: "DELETE",
    path: `/supervisors/${supervisor.id}/accounts/${accountId}`,
    cookieHeader: cookies.cookieHeader,
  });

  // Re-create with same account number should reactivate
  response = await makeRequest(API_BASE, {
    method: "POST",
    path: `/supervisors/${supervisor.id}/accounts`,
    cookieHeader: cookies.cookieHeader,
    body: { accountNumber: "REACTIVATE-001", label: "New Label" },
  });

  assertEquals(response.status, 201);
  assertExists(response.body.account);
  assertEquals(response.body.account.id, accountId);
  assertEquals(response.body.account.isActive, true);
  assertEquals(response.body.account.label, "New Label");
});

Deno.test({ name: "Accounts: POST - cannot create account for user without supervisor role", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  await delay(500);
  const { admin, user } = await createTestUsers();

  const adminLogin = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: { email: admin.email, password: admin.password },
  });
  const cookies = parseSetCookie(adminLogin.headers.get("set-cookie"));

  const response = await makeRequest(API_BASE, {
    method: "POST",
    path: `/supervisors/${user.id}/accounts`,
    cookieHeader: cookies.cookieHeader,
    body: { accountNumber: "USER-001", label: "Should Fail" },
  });

  assertEquals(response.status, 400);
  assertExists(response.body.error);
});

Deno.test({ name: "Accounts: GET - non-existent supervisor returns 404", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { admin } = await createTestUsers();

  const adminLogin = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: { email: admin.email, password: admin.password },
  });
  const cookies = parseSetCookie(adminLogin.headers.get("set-cookie"));

  const response = await makeRequest(API_BASE, {
    method: "GET",
    path: `/supervisors/00000000-0000-0000-0000-000000000000/accounts`,
    cookieHeader: cookies.cookieHeader,
  });

  assertEquals(response.status, 404);
  assertExists(response.body.error);
});

Deno.test({ name: "Accounts: PATCH - update to conflicting account number returns 409", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  await delay(500);
  const { admin, supervisor } = await createTestUsers();

  await createSupervisorAccount(supervisor.id, "EXISTING-001", "Existing Budget");

  const adminLogin = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: { email: admin.email, password: admin.password },
  });
  const cookies = parseSetCookie(adminLogin.headers.get("set-cookie"));

  // Create a second account
  let response = await makeRequest(API_BASE, {
    method: "POST",
    path: `/supervisors/${supervisor.id}/accounts`,
    cookieHeader: cookies.cookieHeader,
    body: { accountNumber: "OTHER-001", label: "Other Budget" },
  });
  assertEquals(response.status, 201);
  const otherId = response.body.account.id;

  // Try to rename second account to the same number as first
  response = await makeRequest(API_BASE, {
    method: "PATCH",
    path: `/supervisors/${supervisor.id}/accounts/${otherId}`,
    cookieHeader: cookies.cookieHeader,
    body: { accountNumber: "EXISTING-001" },
  });

  assertEquals(response.status, 409);
  assertExists(response.body.error);
});

Deno.test({ name: "Accounts: unauthenticated access returns 401", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { supervisor } = await createTestUsers();

  const response = await makeRequest(API_BASE, {
    method: "GET",
    path: `/supervisors/${supervisor.id}/accounts`,
  });

  assertEquals(response.status, 401);
  assertExists(response.body.error);
});

Deno.test({ name: "Accounts: DELETE - non-existent account returns 404", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { admin, supervisor } = await createTestUsers();

  const adminLogin = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: { email: admin.email, password: admin.password },
  });
  const cookies = parseSetCookie(adminLogin.headers.get("set-cookie"));

  const response = await makeRequest(API_BASE, {
    method: "DELETE",
    path: `/supervisors/${supervisor.id}/accounts/00000000-0000-0000-0000-000000000000`,
    cookieHeader: cookies.cookieHeader,
  });

  assertEquals(response.status, 404);
  assertExists(response.body.error);
});
