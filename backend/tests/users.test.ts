import { assertEquals, assertExists, assert } from "jsr:@std/assert";
import { cleanupDatabase, createTestUsers, createTestUser, makeRequest, parseSetCookie } from "./test-utils.ts";

const API_BASE = "http://localhost:8000/api";

Deno.test({ name: "Users: GET /api/users - access control", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { admin, supervisor, user } = await createTestUsers();

  // 1. Regular user cannot access
  const userLogin = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: { email: user.email, password: user.password },
  });
  let cookies = parseSetCookie(userLogin.headers.get("set-cookie"));
  let response = await makeRequest(API_BASE, {
    method: "GET",
    path: "/users",
    cookieHeader: cookies.cookieHeader,
  });
  assertEquals(response.status, 403);

  // 2. Supervisor CAN access
  const supLogin = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: { email: supervisor.email, password: supervisor.password },
  });
  cookies = parseSetCookie(supLogin.headers.get("set-cookie"));
  response = await makeRequest(API_BASE, {
    method: "GET",
    path: "/users",
    cookieHeader: cookies.cookieHeader,
  });
  assertEquals(response.status, 200);
  assertExists(response.body.users);
  assertEquals(Array.isArray(response.body.users), true);

  // 3. Admin CAN access
  const adminLogin = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: { email: admin.email, password: admin.password },
  });
  cookies = parseSetCookie(adminLogin.headers.get("set-cookie"));
  response = await makeRequest(API_BASE, {
    method: "GET",
    path: "/users",
    cookieHeader: cookies.cookieHeader,
  });
  assertEquals(response.status, 200);
  assertExists(response.body.users);
});

Deno.test({ name: "Users: PATCH /api/users/:id - access control and update", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { admin, supervisor, user } = await createTestUsers();

  // 1. Supervisor CANNOT update users
  const supLogin = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: { email: supervisor.email, password: supervisor.password },
  });
  let cookies = parseSetCookie(supLogin.headers.get("set-cookie"));
  let response = await makeRequest(API_BASE, {
    method: "PATCH",
    path: `/users/${user.id}`,
    cookieHeader: cookies.cookieHeader,
    body: { role: "SUPERVISOR" },
  });
  assertEquals(response.status, 403);

  // 2. Admin CAN update users
  const adminLogin = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: { email: admin.email, password: admin.password },
  });
  cookies = parseSetCookie(adminLogin.headers.get("set-cookie"));

  // Assign user to admin as supervisor
  response = await makeRequest(API_BASE, {
    method: "PATCH",
    path: `/users/${user.id}`,
    cookieHeader: cookies.cookieHeader,
    body: { supervisorId: admin.id },
  });
  assertEquals(response.status, 200);
  assertExists(response.body.user);
  assertEquals(response.body.user.supervisorId, admin.id);

  // Promote user to SUPERVISOR
  response = await makeRequest(API_BASE, {
    method: "PATCH",
    path: `/users/${user.id}`,
    cookieHeader: cookies.cookieHeader,
    body: { role: "SUPERVISOR", supervisorId: null },
  });
  assertEquals(response.status, 200);
  assertExists(response.body.user);
  assertEquals(response.body.user.role, "SUPERVISOR");
  assertEquals(response.body.user.supervisorId, null);
});

Deno.test({ name: "Users: GET /api/users - unauthenticated returns 401", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();

  const response = await makeRequest(API_BASE, {
    method: "GET",
    path: "/users",
  });

  assertEquals(response.status, 401);
  assertExists(response.body.error);
});

Deno.test({ name: "Users: PATCH /api/users/:id - regular user cannot update", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { user, supervisor } = await createTestUsers();

  const userLogin = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: { email: user.email, password: user.password },
  });
  const cookies = parseSetCookie(userLogin.headers.get("set-cookie"));

  const response = await makeRequest(API_BASE, {
    method: "PATCH",
    path: `/users/${supervisor.id}`,
    cookieHeader: cookies.cookieHeader,
    body: { role: "USER" },
  });

  assertEquals(response.status, 403);
  assertExists(response.body.error);
});

Deno.test({ name: "Users: PATCH /api/users/:id - non-existent user returns 404", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { admin } = await createTestUsers();

  const adminLogin = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: { email: admin.email, password: admin.password },
  });
  const cookies = parseSetCookie(adminLogin.headers.get("set-cookie"));

  const response = await makeRequest(API_BASE, {
    method: "PATCH",
    path: "/users/00000000-0000-0000-0000-000000000000",
    cookieHeader: cookies.cookieHeader,
    body: { role: "SUPERVISOR" },
  });

  assertEquals(response.status, 404);
  assertExists(response.body.error);
});

Deno.test({ name: "Users: PATCH /api/users/:id - assigning non-existent supervisor returns 404", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { admin, user } = await createTestUsers();

  const adminLogin = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: { email: admin.email, password: admin.password },
  });
  const cookies = parseSetCookie(adminLogin.headers.get("set-cookie"));

  const response = await makeRequest(API_BASE, {
    method: "PATCH",
    path: `/users/${user.id}`,
    cookieHeader: cookies.cookieHeader,
    body: { supervisorId: "00000000-0000-0000-0000-000000000000" },
  });

  assertEquals(response.status, 404);
  assertExists(response.body.error);
});

Deno.test({ name: "Users: PATCH /api/users/:id - assigning supervisor with USER role returns 400", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { admin, user } = await createTestUsers();
  const otherUser = await createTestUser("other@example.com", "TestPass123!", "Other", "User", "USER");

  const adminLogin = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: { email: admin.email, password: admin.password },
  });
  const cookies = parseSetCookie(adminLogin.headers.get("set-cookie"));

  // Try to assign a regular USER as supervisor
  const response = await makeRequest(API_BASE, {
    method: "PATCH",
    path: `/users/${user.id}`,
    cookieHeader: cookies.cookieHeader,
    body: { supervisorId: otherUser.id },
  });

  assertEquals(response.status, 400);
  assertExists(response.body.error);
});

Deno.test({ name: "Users: GET /api/users - returns all users with supervisor info", sanitizeResources: false, sanitizeOps: false }, async () => {
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
    path: "/users",
    cookieHeader: cookies.cookieHeader,
  });

  assertEquals(response.status, 200);
  assertEquals(response.body.users.length, 3);

  // Find the regular user and verify supervisor info
  const regularUser = response.body.users.find((u: any) => u.role === "USER");
  assertExists(regularUser);
  assertExists(regularUser.supervisor);
  assertExists(regularUser.supervisorId);
});

Deno.test({ name: "Users: PATCH /api/users/:id - unauthenticated returns 401", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { user } = await createTestUsers();

  const response = await makeRequest(API_BASE, {
    method: "PATCH",
    path: `/users/${user.id}`,
    body: { role: "SUPERVISOR" },
  });

  assertEquals(response.status, 401);
  assertExists(response.body.error);
});
