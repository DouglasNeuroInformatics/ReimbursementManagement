import { assertEquals, assertExists } from "jsr:@std/assert";
import { cleanupDatabase, createTestUsers, makeRequest, parseSetCookie } from "./test-utils.ts";

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
