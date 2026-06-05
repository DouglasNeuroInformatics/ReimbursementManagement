import { assert, assertEquals, assertExists } from "jsr:@std/assert";
import {
  cleanupDatabase,
  createTestUser,
  createTestUsers,
  makeRequest,
  parseSetCookie,
  prisma,
} from "./test-utils.ts";

const API_BASE = "http://localhost:8000/api";

Deno.test({
  name: "Users: GET /api/users - access control",
  sanitizeResources: false,
  sanitizeOps: false,
}, async () => {
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

Deno.test({
  name: "Users: PATCH /api/users/:id - access control and update",
  sanitizeResources: false,
  sanitizeOps: false,
}, async () => {
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

Deno.test({
  name: "Users: GET /api/users - unauthenticated returns 401",
  sanitizeResources: false,
  sanitizeOps: false,
}, async () => {
  await cleanupDatabase();

  const response = await makeRequest(API_BASE, {
    method: "GET",
    path: "/users",
  });

  assertEquals(response.status, 401);
  assertExists(response.body.error);
});

Deno.test({
  name: "Users: PATCH /api/users/:id - regular user cannot update",
  sanitizeResources: false,
  sanitizeOps: false,
}, async () => {
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

Deno.test({
  name: "Users: PATCH /api/users/:id - non-existent user returns 404",
  sanitizeResources: false,
  sanitizeOps: false,
}, async () => {
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

Deno.test({
  name:
    "Users: PATCH /api/users/:id - assigning non-existent supervisor returns 404",
  sanitizeResources: false,
  sanitizeOps: false,
}, async () => {
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

Deno.test({
  name:
    "Users: PATCH /api/users/:id - assigning supervisor with USER role returns 400",
  sanitizeResources: false,
  sanitizeOps: false,
}, async () => {
  await cleanupDatabase();
  const { admin, user } = await createTestUsers();
  const otherUser = await createTestUser(
    "other@example.com",
    "TestPass123!",
    "Other",
    "User",
    "USER",
  );

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

Deno.test({
  name: "Users: GET /api/users - returns all users with supervisor info",
  sanitizeResources: false,
  sanitizeOps: false,
}, async () => {
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
  assertEquals(response.body.users.length, 5);

  // Find the regular user and verify supervisor info
  const regularUser = response.body.users.find((u: any) => u.role === "USER");
  assertExists(regularUser);
  assertExists(regularUser.supervisor);
  assertExists(regularUser.supervisorId);
});

Deno.test({
  name: "Users: PATCH /api/users/:id - unauthenticated returns 401",
  sanitizeResources: false,
  sanitizeOps: false,
}, async () => {
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

Deno.test({
  name:
    "Users: PATCH /api/users/:id - admin cannot demote their own role (#10)",
  sanitizeResources: false,
  sanitizeOps: false,
}, async () => {
  await cleanupDatabase();
  const { admin } = await createTestUsers();

  // Demote self FINANCIAL_ADMIN -> USER is hard-blocked.
  const toUser = await makeRequest(API_BASE, {
    method: "PATCH",
    path: `/users/${admin.id}`,
    cookieHeader: admin.cookieHeader,
    body: { role: "USER" },
  });
  assertEquals(toUser.status, 400);
  assertEquals(toUser.body.code, "USER_CANNOT_DEMOTE_SELF");

  // Self change to any non-admin role (SUPERVISOR) is blocked too.
  const toSupervisor = await makeRequest(API_BASE, {
    method: "PATCH",
    path: `/users/${admin.id}`,
    cookieHeader: admin.cookieHeader,
    body: { role: "SUPERVISOR" },
  });
  assertEquals(toSupervisor.status, 400);
  assertEquals(toSupervisor.body.code, "USER_CANNOT_DEMOTE_SELF");

  // The role was not changed.
  const stillAdmin = await prisma.user.findUnique({ where: { id: admin.id } });
  assertEquals(stillAdmin?.role, "FINANCIAL_ADMIN");
});

Deno.test({
  name:
    "Users: PATCH /api/users/:id - cannot demote a supervisor with subordinates to USER (#9)",
  sanitizeResources: false,
  sanitizeOps: false,
}, async () => {
  await cleanupDatabase();
  const { admin, supervisor } = await createTestUsers();

  // `supervisor` has one subordinate (`user`) in the seeded graph.
  const response = await makeRequest(API_BASE, {
    method: "PATCH",
    path: `/users/${supervisor.id}`,
    cookieHeader: admin.cookieHeader,
    body: { role: "USER" },
  });

  assertEquals(response.status, 400);
  assertEquals(response.body.code, "USER_HAS_SUBORDINATES");
  assertEquals(response.body.details.count, 1);

  const unchanged = await prisma.user.findUnique({
    where: { id: supervisor.id },
  });
  assertEquals(unchanged?.role, "SUPERVISOR");
});

Deno.test({
  name:
    "Users: PATCH /api/users/:id - promotion and demoting other admins still works",
  sanitizeResources: false,
  sanitizeOps: false,
}, async () => {
  await cleanupDatabase();
  const { admin, admin2, user } = await createTestUsers();

  // Promotion is unaffected by the demotion guards.
  const promote = await makeRequest(API_BASE, {
    method: "PATCH",
    path: `/users/${user.id}`,
    cookieHeader: admin.cookieHeader,
    body: { role: "SUPERVISOR" },
  });
  assertEquals(promote.status, 200);
  assertEquals(promote.body.user.role, "SUPERVISOR");

  // Admins may demote *other* admins with no subordinates (the guard is self-only).
  const demoteOther = await makeRequest(API_BASE, {
    method: "PATCH",
    path: `/users/${admin2.id}`,
    cookieHeader: admin.cookieHeader,
    body: { role: "USER" },
  });
  assertEquals(demoteOther.status, 200);
  assertEquals(demoteOther.body.user.role, "USER");
});
