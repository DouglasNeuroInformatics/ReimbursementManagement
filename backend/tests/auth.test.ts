import { assertEquals, assertExists, assert } from "jsr:@std/assert";
import { cleanupDatabase, createTestUser, createTestUsers, makeRequest, parseSetCookie } from "./test-utils.ts";

const API_BASE = "http://localhost:8000/api";

Deno.test({ name: "Auth: POST /api/auth/register - successful registration", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();

  const response = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/register",
    body: {
      email: "newuser@example.com",
      password: "Password123!",
      firstName: "New",
      lastName: "User",
    },
  });

  assertEquals(response.status, 201);
  assertExists(response.body.user);
  assertEquals(response.body.user.email, "newuser@example.com");
  assertEquals(response.body.user.firstName, "New");
  assertEquals(response.body.user.lastName, "User");
  assertEquals(response.body.user.role, "USER");
});

Deno.test({ name: "Auth: POST /api/auth/register - duplicate email should fail", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  await createTestUser("existing@example.com", "Password123!", "Existing", "User");

  const response = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/register",
    body: {
      email: "existing@example.com",
      password: "Password123!",
      firstName: "New",
      lastName: "User",
    },
  });

  assertEquals(response.status, 409);
  assertExists(response.body.error);
});

Deno.test({ name: "Auth: POST /api/auth/register - invalid email format", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();

  const response = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/register",
    body: {
      email: "invalid-email",
      password: "Password123!",
      firstName: "New",
      lastName: "User",
    },
  });

  assertEquals(response.status, 422);
  assertExists(response.body.error);
});

Deno.test({ name: "Auth: POST /api/auth/register - password too short", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();

  const response = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/register",
    body: {
      email: "newuser@example.com",
      password: "1234567",
      firstName: "New",
      lastName: "User",
    },
  });

  assertEquals(response.status, 422);
  assertExists(response.body.error);
});

Deno.test({ name: "Auth: POST /api/auth/register - missing required fields", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();

  const response = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/register",
    body: {
      email: "newuser@example.com",
      password: "Password123!",
    },
  });

  assertEquals(response.status, 422);
  assertExists(response.body.error);
});

Deno.test({ name: "Auth: POST /api/auth/login - successful login", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const testUser = await createTestUser("login@example.com", "Password123!", "Login", "User");

  const response = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: {
      email: "login@example.com",
      password: "Password123!",
    },
  });

  assertEquals(response.status, 200);
  assertExists(response.body.user);
  assertEquals(response.body.user.email, "login@example.com");
  assertEquals(response.body.user.id, testUser.id);

  const cookies = parseSetCookie(response.headers.get("set-cookie"));
  assertExists(cookies.accessToken);
  assertExists(cookies.refreshToken);
});

Deno.test({ name: "Auth: POST /api/auth/login - invalid credentials", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  await createTestUser("login@example.com", "Password123!", "Login", "User");

  const response = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: {
      email: "login@example.com",
      password: "WrongPassword123!",
    },
  });

  assertEquals(response.status, 401);
  assertExists(response.body.error);
});

Deno.test({ name: "Auth: POST /api/auth/login - non-existent user", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();

  const response = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: {
      email: "nonexistent@example.com",
      password: "Password123!",
    },
  });

  assertEquals(response.status, 401);
  assertExists(response.body.error);
});

Deno.test({ name: "Auth: POST /api/auth/login - email normalized (case insensitive)", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  await createTestUser("login@example.com", "Password123!", "Login", "User");

  const response = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: {
      email: "LOGIN@EXAMPLE.COM",
      password: "Password123!",
    },
  });

  assertEquals(response.status, 200);
  assertExists(response.body.user);
});

Deno.test({ name: "Auth: GET /api/auth/me - authenticated user", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const testUser = await createTestUser("me@example.com", "Password123!", "Test", "User");

  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: {
      email: "me@example.com",
      password: "Password123!",
    },
  });

  assertEquals(loginResponse.status, 200);
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));

  const response = await makeRequest(API_BASE, {
    method: "GET",
    path: "/auth/me",
    cookieHeader: cookies.cookieHeader,
  });

  assertEquals(response.status, 200);
  assertExists(response.body.user);
  assertEquals(response.body.user.id, testUser.id);
  assertEquals(response.body.user.email, "me@example.com");
  assertEquals(response.body.user.firstName, "Test");
});

Deno.test({ name: "Auth: GET /api/auth/me - unauthenticated user", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();

  const response = await makeRequest(API_BASE, {
    method: "GET",
    path: "/auth/me",
  });

  assertEquals(response.status, 401);
  assertExists(response.body.error);
});

Deno.test({ name: "Auth: PATCH /api/auth/me - update profile fields", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const testUser = await createTestUser("patch@example.com", "Password123!", "Patch", "User");

  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: {
      email: "patch@example.com",
      password: "Password123!",
    },
  });

  assertEquals(loginResponse.status, 200);
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));

  const response = await makeRequest(API_BASE, {
    method: "PATCH",
    path: "/auth/me",
    body: {
      jobPosition: "Software Engineer",
      phone: "613-555-0100",
      extension: "4201",
      address: "123 Main St\nOttawa, ON K1A 0B9",
    },
    cookieHeader: cookies.cookieHeader,
  });

  assertEquals(response.status, 200);
  assertExists(response.body.user);
  assertEquals(response.body.user.jobPosition, "Software Engineer");
  assertEquals(response.body.user.phone, "613-555-0100");
  assertEquals(response.body.user.extension, "4201");
  assertEquals(response.body.user.address, "123 Main St\nOttawa, ON K1A 0B9");
});

Deno.test({ name: "Auth: PATCH /api/auth/me - set fields to null", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const testUser = await createTestUser("null@example.com", "Password123!", "Null", "User");

  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: {
      email: "null@example.com",
      password: "Password123!",
    },
  });

  assertEquals(loginResponse.status, 200);
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));

  await makeRequest(API_BASE, {
    method: "PATCH",
    path: "/auth/me",
    body: {
      jobPosition: "Some Position",
      phone: "613-555-0100",
      extension: "4201",
      address: "123 Main St",
    },
    cookieHeader: cookies.cookieHeader,
  });


  const response = await makeRequest(API_BASE, {
    method: "PATCH",
    path: "/auth/me",
    body: {
      jobPosition: null,
      phone: null,
      extension: null,
      address: null,
    },
    cookieHeader: cookies.cookieHeader,
  });

  assertEquals(response.status, 200);
  assertExists(response.body.user);
  assertEquals(response.body.user.jobPosition, null);
  assertEquals(response.body.user.phone, null);
  assertEquals(response.body.user.extension, null);
  assertEquals(response.body.user.address, null);
});

Deno.test({ name: "Auth: PATCH /api/auth/me - unauthenticated", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();

  const response = await makeRequest(API_BASE, {
    method: "PATCH",
    path: "/auth/me",
    body: {
      jobPosition: "Software Engineer",
    },
  });

  assertEquals(response.status, 401);
  assertExists(response.body.error);
});

Deno.test({ name: "Auth: POST /api/auth/logout - successful logout", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const testUser = await createTestUser("logout@example.com", "Password123!", "Logout", "User");

  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: {
      email: "logout@example.com",
      password: "Password123!",
    },
  });

  assertEquals(loginResponse.status, 200);
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));

  const response = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/logout",
    cookieHeader: cookies.cookieHeader,
  });

  assertEquals(response.status, 200);
  assertEquals(response.body.success, true);

  const setCookieHeader = response.headers.get("set-cookie");
  assertExists(setCookieHeader);
  const cookieArray = setCookieHeader.split(",");
  const accessCookie = cookieArray.find((c: string) => c.trim().startsWith("access_token="));
  const refreshCookie = cookieArray.find((c: string) => c.trim().startsWith("refresh_token="));
  assertExists(accessCookie);
  assertExists(refreshCookie);
  assert(accessCookie.includes("Max-Age=0"));
  assert(refreshCookie.includes("Max-Age=0"));
});

Deno.test({ name: "Auth: POST /api/auth/refresh - successful token refresh", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const testUser = await createTestUser("refresh@example.com", "Password123!", "Refresh", "User");

  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: {
      email: "refresh@example.com",
      password: "Password123!",
    },
  });

  assertEquals(loginResponse.status, 200);
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));

  const response = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/refresh",
    cookieHeader: cookies.cookieHeader,
  });

  assertEquals(response.status, 200);
  assertEquals(response.body.success, true);

  const setCookieHeader = response.headers.get("set-cookie");
  assertExists(setCookieHeader);
  const cookieArray = setCookieHeader.split(",");
  const newAccessCookie = cookieArray.find((c: string) => c.trim().startsWith("access_token="));
  assertExists(newAccessCookie);
});

Deno.test({ name: "Auth: POST /api/auth/refresh - no refresh token", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();

  const response = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/refresh",
  });

  assertEquals(response.status, 401);
  assertExists(response.body.error);
});

Deno.test({ name: "Auth: POST /api/auth/refresh - invalid refresh token", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();

  const response = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/refresh",
    cookieHeader: "refresh_token=invalid-token-uuid",
  });

  assertEquals(response.status, 401);
  assertExists(response.body.error);
});

Deno.test({ name: "Auth: POST /api/auth/refresh - missing X-Requested-With is rejected (CSRF)", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  await createTestUser("csrf-refresh@example.com", "Password123!", "CSRF", "Refresh");

  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: { email: "csrf-refresh@example.com", password: "Password123!" },
  });
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));

  const response = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/refresh",
    cookieHeader: cookies.cookieHeader,
    skipCsrfHeader: true,
  });

  assertEquals(response.status, 403);
  assertExists(response.body.error);
});

Deno.test({ name: "Auth: POST /api/auth/logout - missing X-Requested-With is rejected (CSRF)", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  await createTestUser("csrf-logout@example.com", "Password123!", "CSRF", "Logout");

  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: { email: "csrf-logout@example.com", password: "Password123!" },
  });
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));

  const response = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/logout",
    cookieHeader: cookies.cookieHeader,
    skipCsrfHeader: true,
  });

  assertEquals(response.status, 403);
  assertExists(response.body.error);
});

Deno.test({ name: "Auth: rate-limit lets requests through when no IP headers in dev/test env", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();

  // No X-Real-IP / X-Forwarded-For. In production this would 429 (fail closed);
  // in test/dev the middleware lets the request reach the handler.
  const response = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: { email: "no-such-user@example.com", password: "wrong" },
    skipIpHeader: true,
  });

  // The rate limiter passed through, so the handler ran and returned its
  // own auth error (401) — not 429 from the rate limiter.
  assertEquals(response.status, 401);
});
