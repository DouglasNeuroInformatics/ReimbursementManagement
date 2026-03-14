import { assertEquals, assertExists } from "jsr:@std/assert";
import { cleanupDatabase, createTestUsers, makeRequest, parseSetCookie } from "./test-utils.ts";

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
