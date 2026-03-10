import { assertEquals, assertExists, assert } from "jsr:@std/assert";
import { cleanupDatabase, createTestUsers, createTestRequest, makeRequest, parseSetCookie, delay } from "./test-utils.ts";
import type { RequestType } from "../src/generated/prisma/client.ts";

const API_BASE = "http://localhost:8000/api";

Deno.test({ name: "Requests: GET /api/requests - list requests for user", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { user } = await createTestUsers();
  
  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: {
      email: user.email,
      password: user.password,
    },
  });
  
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));
  
  const response = await makeRequest(API_BASE, {
    method: "GET",
    path: "/requests",
    cookieHeader: cookies.cookieHeader,
  });

  assertEquals(response.status, 200);
  assertExists(response.body.requests);
  assert(Array.isArray(response.body.requests));
});

Deno.test({ name: "Requests: GET /api/requests - filter by status", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { user } = await createTestUsers();
  await createTestRequest(user.id, "REIMBURSEMENT", "DRAFT");
  await createTestRequest(user.id, "REIMBURSEMENT", "SUBMITTED");
  await createTestRequest(user.id, "REIMBURSEMENT", "PAID");
  
  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: {
      email: user.email,
      password: user.password,
    },
  });
  
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));
  
  const response = await makeRequest(API_BASE, {
    method: "GET",
    path: "/requests?status=DRAFT",
    cookieHeader: cookies.cookieHeader,
  });

  assertEquals(response.status, 200);
  assertExists(response.body.requests);
  assertEquals(response.body.requests.length, 1);
  assertEquals(response.body.requests[0].status, "DRAFT");
});

Deno.test({ name: "Requests: GET /api/requests - filter by type", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { user } = await createTestUsers();
  await createTestRequest(user.id, "REIMBURSEMENT", "DRAFT");
  await createTestRequest(user.id, "TRAVEL_ADVANCE", "DRAFT");
  await createTestRequest(user.id, "TRAVEL_REIMBURSEMENT", "DRAFT");
  
  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: {
      email: user.email,
      password: user.password,
    },
  });
  
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));
  
  const response = await makeRequest(API_BASE, {
    method: "GET",
    path: "/requests?type=TRAVEL_ADVANCE",
    cookieHeader: cookies.cookieHeader,
  });

  assertEquals(response.status, 200);
  assertExists(response.body.requests);
  assertEquals(response.body.requests.length, 1);
  assertEquals(response.body.requests[0].type, "TRAVEL_ADVANCE");
});

Deno.test({ name: "Requests: GET /api/requests - cursor pagination", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { user } = await createTestUsers();
  
  for (let i = 0; i < 5; i++) {
    await createTestRequest(user.id, "REIMBURSEMENT", "DRAFT");
  }
  
  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: {
      email: user.email,
      password: user.password,
    },
  });
  
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));
  
  const response = await makeRequest(API_BASE, {
    method: "GET",
    path: "/requests?limit=2",
    cookieHeader: cookies.cookieHeader,
  });

  assertEquals(response.status, 200);
  assertExists(response.body.requests);
  assertEquals(response.body.requests.length, 2);
  assertExists(response.body.nextCursor);
});

Deno.test({ name: "Requests: POST /api/requests - create reimbursement request", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  await delay(500);
  const { user } = await createTestUsers();
  
  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: {
      email: user.email,
      password: user.password,
    },
  });
  
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));
  
  const response = await makeRequest(API_BASE, {
    method: "POST",
    path: "/requests",
    cookieHeader: cookies.cookieHeader,
    body: {
      type: "REIMBURSEMENT",
      title: "Test Reimbursement",
      description: "Test description",
    },
  });

  assertEquals(response.status, 201);
  assertExists(response.body.request);
  assertEquals(response.body.request.type, "REIMBURSEMENT");
  assertEquals(response.body.request.title, "Test Reimbursement");
  assertEquals(response.body.request.status, "DRAFT");
  assertEquals(response.body.request.userId, user.id);
});

Deno.test({ name: "Requests: POST /api/requests - create travel advance request", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  await delay(500);
  const { user } = await createTestUsers();
  
  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: {
      email: user.email,
      password: user.password,
    },
  });
  
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));
  
  const response = await makeRequest(API_BASE, {
    method: "POST",
    path: "/requests",
    cookieHeader: cookies.cookieHeader,
    body: {
      type: "TRAVEL_ADVANCE",
      title: "Test Travel Advance",
      description: "Test travel description",
    },
  });

  assertEquals(response.status, 201);
  assertExists(response.body.request);
  assertEquals(response.body.request.type, "TRAVEL_ADVANCE");
  assertEquals(response.body.request.title, "Test Travel Advance");
  assertEquals(response.body.request.status, "DRAFT");
});

Deno.test({ name: "Requests: POST /api/requests - create travel reimbursement request", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  await delay(500);
  const { user } = await createTestUsers();
  
  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: {
      email: user.email,
      password: user.password,
    },
  });
  
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));
  
  const response = await makeRequest(API_BASE, {
    method: "POST",
    path: "/requests",
    cookieHeader: cookies.cookieHeader,
    body: {
      type: "TRAVEL_REIMBURSEMENT",
      title: "Test Travel Reimbursement",
      description: "Test travel reimbursement description",
    },
  });

  assertEquals(response.status, 201);
  assertExists(response.body.request);
  assertEquals(response.body.request.type, "TRAVEL_REIMBURSEMENT");
  assertEquals(response.body.request.title, "Test Travel Reimbursement");
  assertEquals(response.body.request.status, "DRAFT");
});

Deno.test({ name: "Requests: POST /api/requests - unauthenticated", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();

  const response = await makeRequest(API_BASE, {
    method: "POST",
    path: "/requests",
    body: {
      type: "REIMBURSEMENT",
      title: "Test Reimbursement",
    },
  });

  assertEquals(response.status, 401);
  assertExists(response.body.error);
});

Deno.test({ name: "Requests: POST /api/requests - invalid type", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  await delay(500);
  const { user } = await createTestUsers();
  
  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: {
      email: user.email,
      password: user.password,
    },
  });
  
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));
  
  const response = await makeRequest(API_BASE, {
    method: "POST",
    path: "/requests",
    cookieHeader: cookies.cookieHeader,
    body: {
      type: "INVALID_TYPE" as RequestType,
      title: "Test Request",
    },
  });

  assertEquals(response.status, 422);
  assertExists(response.body.error);
});

Deno.test({ name: "Requests: POST /api/requests - missing required fields", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  await delay(500);
  const { user } = await createTestUsers();
  
  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: {
      email: user.email,
      password: user.password,
    },
  });
  
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));
  
  const response = await makeRequest(API_BASE, {
    method: "POST",
    path: "/requests",
    cookieHeader: cookies.cookieHeader,
    body: {
      type: "REIMBURSEMENT",
    },
  });

  assertEquals(response.status, 422);
  assertExists(response.body.error);
});

Deno.test({ name: "Requests: GET /api/requests/:id - get own request", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { user } = await createTestUsers();
  const request = await createTestRequest(user.id, "REIMBURSEMENT", "DRAFT", "Test Request");
  
  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: {
      email: user.email,
      password: user.password,
    },
  });
  
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));
  
  const response = await makeRequest(API_BASE, {
    method: "GET",
    path: `/requests/${request.id}`,
    cookieHeader: cookies.cookieHeader,
  });

  assertEquals(response.status, 200);
  assertExists(response.body.request);
  assertEquals(response.body.request.id, request.id);
  assertEquals(response.body.request.title, "Test Request");
});

Deno.test({ name: "Requests: GET /api/requests/:id - unauthenticated", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { user } = await createTestUsers();
  const request = await createTestRequest(user.id, "REIMBURSEMENT", "DRAFT");
  
  const response = await makeRequest(API_BASE, {
    method: "GET",
    path: `/requests/${request.id}`,
  });

  assertEquals(response.status, 401);
  assertExists(response.body.error);
});

Deno.test({ name: "Requests: PATCH /api/requests/:id - update draft request", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  await delay(500);
  const { user } = await createTestUsers();
  const request = await createTestRequest(user.id, "REIMBURSEMENT", "DRAFT", "Original Title");
  
  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: {
      email: user.email,
      password: user.password,
    },
  });
  
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));
  
  const response = await makeRequest(API_BASE, {
    method: "PATCH",
    path: `/requests/${request.id}`,
    cookieHeader: cookies.cookieHeader,
    body: {
      title: "Updated Title",
      description: "Updated description",
      reimbursement: {
        items: [
          {
            description: "New Item",
            amount: 50.0,
            date: new Date("2026-01-01").toISOString(),
          },
        ],
      },
    },
  });

  assertEquals(response.status, 200);
  assertExists(response.body.request);
  assertEquals(response.body.request.title, "Updated Title");
  assertEquals(response.body.request.description, "Updated description");
});

Deno.test({ name: "Requests: PATCH /api/requests/:id - cannot update submitted request", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  await delay(500);
  const { user } = await createTestUsers();
  const request = await createTestRequest(user.id, "REIMBURSEMENT", "SUBMITTED");
  
  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: {
      email: user.email,
      password: user.password,
    },
  });
  
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));
  
  const response = await makeRequest(API_BASE, {
    method: "PATCH",
    path: `/requests/${request.id}`,
    cookieHeader: cookies.cookieHeader,
    body: {
      title: "Should not work",
    },
  });

  assertEquals(response.status, 400);
  assertExists(response.body.error);
});

Deno.test({ name: "Requests: PATCH /api/requests/:id - unauthenticated", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { user } = await createTestUsers();
  const request = await createTestRequest(user.id, "REIMBURSEMENT", "DRAFT");
  
  const response = await makeRequest(API_BASE, {
    method: "PATCH",
    path: `/requests/${request.id}`,
    body: {
      title: "Should not work",
    },
  });

  assertEquals(response.status, 401);
  assertExists(response.body.error);
});

Deno.test({ name: "Requests: DELETE /api/requests/:id - delete draft request", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  await delay(500);
  const { user } = await createTestUsers();
  const request = await createTestRequest(user.id, "REIMBURSEMENT", "DRAFT");
  
  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: {
      email: user.email,
      password: user.password,
    },
  });
  
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));
  
  const response = await makeRequest(API_BASE, {
    method: "DELETE",
    path: `/requests/${request.id}`,
    cookieHeader: cookies.cookieHeader,
  });

  assertEquals(response.status, 200);
  assertEquals(response.body.success, true);
});

Deno.test({ name: "Requests: DELETE /api/requests/:id - cannot delete submitted request", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  await delay(500);
  const { user } = await createTestUsers();
  const request = await createTestRequest(user.id, "REIMBURSEMENT", "SUBMITTED");
  
  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: {
      email: user.email,
      password: user.password,
    },
  });
  
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));
  
  const response = await makeRequest(API_BASE, {
    method: "DELETE",
    path: `/requests/${request.id}`,
    cookieHeader: cookies.cookieHeader,
  });

  assertEquals(response.status, 400);
  assertExists(response.body.error);
});

Deno.test({ name: "Requests: DELETE /api/requests/:id - unauthenticated", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { user } = await createTestUsers();
  const request = await createTestRequest(user.id, "REIMBURSEMENT", "DRAFT");
  
  const response = await makeRequest(API_BASE, {
    method: "DELETE",
    path: `/requests/${request.id}`,
  });

  assertEquals(response.status, 401);
  assertExists(response.body.error);
});

Deno.test({ name: "Requests: POST /api/requests/:id/submit - submit draft request", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  await delay(500);
  const { user } = await createTestUsers();
  const request = await createTestRequest(user.id, "REIMBURSEMENT", "DRAFT");
  
  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: {
      email: user.email,
      password: user.password,
    },
  });
  
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));
  
  const response = await makeRequest(API_BASE, {
    method: "POST",
    path: `/requests/${request.id}/submit`,
    cookieHeader: cookies.cookieHeader,
  });

  assertEquals(response.status, 200);
  assertExists(response.body.request);
  assertEquals(response.body.request.status, "SUBMITTED");
  assertExists(response.body.request.submittedAt);
});

Deno.test({ name: "Requests: POST /api/requests/:id/submit - cannot submit non-draft", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  await delay(500);
  const { user } = await createTestUsers();
  const request = await createTestRequest(user.id, "REIMBURSEMENT", "SUBMITTED");
  
  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: {
      email: user.email,
      password: user.password,
    },
  });
  
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));
  
  const response = await makeRequest(API_BASE, {
    method: "POST",
    path: `/requests/${request.id}/submit`,
    cookieHeader: cookies.cookieHeader,
  });

  assertEquals(response.status, 400);
  assertExists(response.body.error);
});

Deno.test({ name: "Requests: POST /api/requests/:id/submit - unauthenticated", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { user } = await createTestUsers();
  const request = await createTestRequest(user.id, "REIMBURSEMENT", "DRAFT");
  
  const response = await makeRequest(API_BASE, {
    method: "POST",
    path: `/requests/${request.id}/submit`,
  });

  assertEquals(response.status, 401);
  assertExists(response.body.error);
});

Deno.test({ name: "Requests: POST /api/requests/:id/revise - revise rejected request", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  await delay(500);
  const { user } = await createTestUsers();
  const request = await createTestRequest(user.id, "REIMBURSEMENT", "SUPERVISOR_REJECTED");
  
  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: {
      email: user.email,
      password: user.password,
    },
  });
  
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));
  
  const response = await makeRequest(API_BASE, {
    method: "POST",
    path: `/requests/${request.id}/revise`,
    cookieHeader: cookies.cookieHeader,
  });

  assertEquals(response.status, 200);
  assertExists(response.body.request);
  assertEquals(response.body.request.status, "DRAFT");
});

Deno.test({ name: "Requests: POST /api/requests/:id/revise - cannot revise draft", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  await delay(500);
  const { user } = await createTestUsers();
  const request = await createTestRequest(user.id, "REIMBURSEMENT", "DRAFT");
  
  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: {
      email: user.email,
      password: user.password,
    },
  });
  
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));
  
  const response = await makeRequest(API_BASE, {
    method: "POST",
    path: `/requests/${request.id}/revise`,
    cookieHeader: cookies.cookieHeader,
  });

  assertEquals(response.status, 400);
  assertExists(response.body.error);
});

Deno.test({ name: "Requests: POST /api/requests/:id/revise - unauthenticated", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { user } = await createTestUsers();
  const request = await createTestRequest(user.id, "REIMBURSEMENT", "SUPERVISOR_REJECTED");
  
  const response = await makeRequest(API_BASE, {
    method: "POST",
    path: `/requests/${request.id}/revise`,
  });

  assertEquals(response.status, 401);
  assertExists(response.body.error);
});

Deno.test({ name: "Requests: GET /api/requests - supervisor sees subordinates' requests", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { user, supervisor } = await createTestUsers();
  await createTestRequest(user.id, "REIMBURSEMENT", "DRAFT");
  await createTestRequest(user.id, "REIMBURSEMENT", "SUBMITTED");
  
  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: {
      email: supervisor.email,
      password: supervisor.password,
    },
  });
  
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));
  
  const response = await makeRequest(API_BASE, {
    method: "GET",
    path: "/requests",
    cookieHeader: cookies.cookieHeader,
  });

  assertEquals(response.status, 200);
  assertExists(response.body.requests);
  assert(response.body.requests.length >= 1);
});

Deno.test({ name: "Requests: GET /api/requests - financial admin sees all requests", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { user, admin } = await createTestUsers();
  await createTestRequest(user.id, "REIMBURSEMENT", "DRAFT");
  await createTestRequest(user.id, "REIMBURSEMENT", "SUBMITTED");
  
  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: {
      email: admin.email,
      password: admin.password,
    },
  });
  
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));
  
  const response = await makeRequest(API_BASE, {
    method: "GET",
    path: "/requests",
    cookieHeader: cookies.cookieHeader,
  });

  assertEquals(response.status, 200);
  assertExists(response.body.requests);
  assert(response.body.requests.length >= 2);
});
