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

Deno.test({ name: "Requests: GET /api/requests - cursor pagination second page", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { user } = await createTestUsers();

  for (let i = 0; i < 5; i++) {
    await createTestRequest(user.id, "REIMBURSEMENT", "DRAFT", `Request ${i}`);
  }

  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: { email: user.email, password: user.password },
  });
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));

  // First page
  const page1 = await makeRequest(API_BASE, {
    method: "GET",
    path: "/requests?limit=2",
    cookieHeader: cookies.cookieHeader,
  });
  assertEquals(page1.status, 200);
  assertEquals(page1.body.requests.length, 2);
  assertEquals(page1.body.hasMore, true);
  assertExists(page1.body.nextCursor);

  // Second page using cursor
  const page2 = await makeRequest(API_BASE, {
    method: "GET",
    path: `/requests?limit=2&cursor=${page1.body.nextCursor}`,
    cookieHeader: cookies.cookieHeader,
  });
  assertEquals(page2.status, 200);
  assertEquals(page2.body.requests.length, 2);
  assertEquals(page2.body.hasMore, true);

  // No overlap between pages
  const page1Ids = page1.body.requests.map((r: any) => r.id);
  const page2Ids = page2.body.requests.map((r: any) => r.id);
  for (const id of page2Ids) {
    assertEquals(page1Ids.includes(id), false);
  }
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

Deno.test({ name: "Requests: GET /api/requests/:id - non-existent request returns 404", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { user } = await createTestUsers();

  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: { email: user.email, password: user.password },
  });
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));

  const response = await makeRequest(API_BASE, {
    method: "GET",
    path: "/requests/00000000-0000-0000-0000-000000000000",
    cookieHeader: cookies.cookieHeader,
  });

  assertEquals(response.status, 404);
  assertExists(response.body.error);
});

Deno.test({ name: "Requests: GET /api/requests/:id - other user cannot view", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { user } = await createTestUsers();
  const otherUser = await createTestRequest(user.id, "REIMBURSEMENT", "DRAFT");

  // Create a second user with no supervisor relationship
  const { cleanupDatabase: _, ...utils } = await import("./test-utils.ts");
  const stranger = await utils.createTestUser("stranger@example.com", "TestPass123!", "Stranger", "User", "USER");

  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: { email: stranger.email, password: stranger.password },
  });
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));

  const response = await makeRequest(API_BASE, {
    method: "GET",
    path: `/requests/${otherUser.id}`,
    cookieHeader: cookies.cookieHeader,
  });

  assertEquals(response.status, 403);
  assertExists(response.body.error);
});

Deno.test({ name: "Requests: GET /api/requests/:id - supervisor can view subordinate's request", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { user, supervisor } = await createTestUsers();
  const request = await createTestRequest(user.id, "REIMBURSEMENT", "SUBMITTED");

  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: { email: supervisor.email, password: supervisor.password },
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

Deno.test({ name: "Requests: PATCH /api/requests/:id - update travel advance details", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  await delay(500);
  const { user } = await createTestUsers();
  const request = await createTestRequest(user.id, "TRAVEL_ADVANCE", "DRAFT");

  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: { email: user.email, password: user.password },
  });
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));

  const response = await makeRequest(API_BASE, {
    method: "PATCH",
    path: `/requests/${request.id}`,
    cookieHeader: cookies.cookieHeader,
    body: {
      travelAdvance: {
        destination: "Toronto",
        purpose: "Conference",
        departureDate: "2026-06-01T00:00:00.000Z",
        returnDate: "2026-06-05T00:00:00.000Z",
        estimatedAmount: 1500,
        items: [
          { category: "airfare", amount: 800, notes: "Round trip" },
          { category: "accommodations", amount: 500, notes: "4 nights" },
          { category: "meals", amount: 200 },
        ],
      },
    },
  });

  assertEquals(response.status, 200);
  assertExists(response.body.request);
  assertExists(response.body.request.travelAdvance);
  assertEquals(response.body.request.travelAdvance.destination, "Toronto");
  assertEquals(response.body.request.travelAdvance.purpose, "Conference");
  assertEquals(response.body.request.travelAdvance.items.length, 3);
});

Deno.test({ name: "Requests: PATCH /api/requests/:id - update travel reimbursement details", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  await delay(500);
  const { user } = await createTestUsers();
  const request = await createTestRequest(user.id, "TRAVEL_REIMBURSEMENT", "DRAFT");

  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: { email: user.email, password: user.password },
  });
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));

  const response = await makeRequest(API_BASE, {
    method: "PATCH",
    path: `/requests/${request.id}`,
    cookieHeader: cookies.cookieHeader,
    body: {
      travelReimbursement: {
        destination: "Vancouver",
        purpose: "Workshop",
        departureDate: "2026-07-10T00:00:00.000Z",
        returnDate: "2026-07-14T00:00:00.000Z",
        totalAmount: 2000,
        items: [
          { date: "2026-07-10T00:00:00.000Z", category: "airfare", amount: 900, vendor: "Air Canada" },
          { date: "2026-07-10T00:00:00.000Z", category: "taxi", amount: 50, vendor: "Airport Taxi" },
        ],
      },
    },
  });

  assertEquals(response.status, 200);
  assertExists(response.body.request);
  assertExists(response.body.request.travelReimbursement);
  assertEquals(response.body.request.travelReimbursement.destination, "Vancouver");
  assertEquals(response.body.request.travelReimbursement.items.length, 2);
});

Deno.test({ name: "Requests: PATCH /api/requests/:id - can update rejected request", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  await delay(500);
  const { user } = await createTestUsers();
  const request = await createTestRequest(user.id, "REIMBURSEMENT", "SUPERVISOR_REJECTED");

  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: { email: user.email, password: user.password },
  });
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));

  const response = await makeRequest(API_BASE, {
    method: "PATCH",
    path: `/requests/${request.id}`,
    cookieHeader: cookies.cookieHeader,
    body: { title: "Revised Title" },
  });

  assertEquals(response.status, 200);
  assertEquals(response.body.request.title, "Revised Title");
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

Deno.test({ name: "Requests: PATCH /api/requests/:id - other user cannot update", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  await delay(500);
  const { user, supervisor } = await createTestUsers();
  const request = await createTestRequest(user.id, "REIMBURSEMENT", "DRAFT");

  // Supervisor tries to update user's request
  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: { email: supervisor.email, password: supervisor.password },
  });
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));

  const response = await makeRequest(API_BASE, {
    method: "PATCH",
    path: `/requests/${request.id}`,
    cookieHeader: cookies.cookieHeader,
    body: { title: "Supervisor edited" },
  });

  assertEquals(response.status, 403);
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

Deno.test({ name: "Requests: DELETE /api/requests/:id - other user cannot delete", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  await delay(500);
  const { user, supervisor } = await createTestUsers();
  const request = await createTestRequest(user.id, "REIMBURSEMENT", "DRAFT");

  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: { email: supervisor.email, password: supervisor.password },
  });
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));

  const response = await makeRequest(API_BASE, {
    method: "DELETE",
    path: `/requests/${request.id}`,
    cookieHeader: cookies.cookieHeader,
  });

  assertEquals(response.status, 403);
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

Deno.test({ name: "Requests: DELETE /api/requests/:id - non-existent request returns 404", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  await delay(500);
  const { user } = await createTestUsers();

  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: { email: user.email, password: user.password },
  });
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));

  const response = await makeRequest(API_BASE, {
    method: "DELETE",
    path: "/requests/00000000-0000-0000-0000-000000000000",
    cookieHeader: cookies.cookieHeader,
  });

  assertEquals(response.status, 404);
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

Deno.test({ name: "Requests: POST /api/requests/:id/submit - other user cannot submit", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  await delay(500);
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
    path: `/requests/${request.id}/submit`,
    cookieHeader: cookies.cookieHeader,
  });

  assertEquals(response.status, 403);
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

Deno.test({ name: "Requests: POST /api/requests/:id/revise - revise supervisor rejected request", sanitizeResources: false, sanitizeOps: false }, async () => {
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

Deno.test({ name: "Requests: POST /api/requests/:id/revise - revise finance rejected request", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  await delay(500);
  const { user } = await createTestUsers();
  const request = await createTestRequest(user.id, "REIMBURSEMENT", "FINANCE_REJECTED");

  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: { email: user.email, password: user.password },
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

Deno.test({ name: "Requests: GET /api/requests - scope=own for admin shows only own requests", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { user, admin } = await createTestUsers();
  await createTestRequest(user.id, "REIMBURSEMENT", "DRAFT");
  await createTestRequest(admin.id, "REIMBURSEMENT", "DRAFT", "Admin's Request");

  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: { email: admin.email, password: admin.password },
  });
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));

  const response = await makeRequest(API_BASE, {
    method: "GET",
    path: "/requests?scope=own",
    cookieHeader: cookies.cookieHeader,
  });

  assertEquals(response.status, 200);
  assertEquals(response.body.requests.length, 1);
  assertEquals(response.body.requests[0].title, "Admin's Request");
});
