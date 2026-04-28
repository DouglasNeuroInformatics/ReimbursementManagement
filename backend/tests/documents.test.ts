import { assertEquals, assertExists } from "jsr:@std/assert";
import { cleanupDatabase, createTestUsers, createTestRequest, createTestUser, createDocument, makeRequest, parseSetCookie, delay, prisma } from "./test-utils.ts";
import type { RequestType } from "../src/generated/prisma/client.ts";

const API_BASE = "http://localhost:8000/api";

Deno.test({ name: "Documents: POST /api/requests/:id/documents - upload document", sanitizeResources: false, sanitizeOps: false }, async () => {
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

  assertEquals(loginResponse.status, 200);
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));

  const formData = new FormData();
  formData.append("file", new Blob(["test document content"], { type: "text/plain" }), "test-document.txt");

  const response = await makeRequest(API_BASE, {
    method: "POST",
    path: `/requests/${request.id}/documents`,
    cookieHeader: cookies.cookieHeader,
    body: formData,
  });

  assertEquals(response.status, 201);
  const result = response.body;
  assertExists(result.document);
  assertEquals(result.document.filename, "test-document.txt");
});

Deno.test({ name: "Documents: POST /api/requests/:id/documents - upload with itemId", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  await delay(500);
  const { user } = await createTestUsers();
  const request = await createTestRequest(user.id, "REIMBURSEMENT", "DRAFT", undefined, {
    reimbursement: { items: [{ description: "test item", amount: 100, date: new Date() }] }
  });

  const requestWithItems = await prisma.request.findUnique({
    where: { id: request.id },
    include: { reimbursement: { include: { items: true } } }
  });
  const itemId = requestWithItems!.reimbursement!.items[0].id;

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

  const formData = new FormData();
  formData.append("file", new Blob(["item document"], { type: "text/plain" }), "item-document.pdf");
  formData.append("itemId", itemId);

  const response = await makeRequest(API_BASE, {
    method: "POST",
    path: `/requests/${request.id}/documents`,
    cookieHeader: cookies.cookieHeader,
    body: formData,
  });

  assertEquals(response.status, 201);
  const result = response.body;
  assertExists(result.document);
  assertEquals(result.document.reimbursementItemId, itemId);
});

Deno.test({ name: "Documents: POST /api/requests/:id/documents - upload to non-editable request", sanitizeResources: false, sanitizeOps: false }, async () => {
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

  assertEquals(loginResponse.status, 200);
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));

  const formData = new FormData();
  formData.append("file", new Blob(["test doc"], { type: "application/pdf" }), "test.pdf");

  const response = await makeRequest(API_BASE, {
    method: "POST",
    path: `/requests/${request.id}/documents`,
    cookieHeader: cookies.cookieHeader,
    body: formData,
  });

  assertEquals(response.status, 400);
  assertExists(response.body.error);
});

Deno.test({ name: "Documents: POST /api/requests/:id/documents - upload exceeds size limit", sanitizeResources: false, sanitizeOps: false }, async () => {
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

  assertEquals(loginResponse.status, 200);
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));

  const largeContent = new Array(51 * 1024 * 1024).fill("a").join("");
  const formData = new FormData();
  formData.append("file", new Blob([largeContent], { type: "text/plain" }), "large-file.txt");

  const response = await makeRequest(API_BASE, {
    method: "POST",
    path: `/requests/${request.id}/documents`,
    cookieHeader: cookies.cookieHeader,
    body: formData,
  });

  assertEquals(response.status, 400);
  assertExists(response.body.error);
});

Deno.test({ name: "Documents: POST /api/requests/:id/documents - invalid file type", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  await delay(500);
  const { user } = await createTestUsers();
  const request = await createTestRequest(user.id, "REIMBURSEMENT", "DRAFT");

  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: { email: user.email, password: user.password },
  });
  assertEquals(loginResponse.status, 200);
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));

  const formData = new FormData();
  formData.append("file", new Blob(["#!/bin/bash\necho hi"], { type: "application/x-shellscript" }), "script.sh");

  const response = await makeRequest(API_BASE, {
    method: "POST",
    path: `/requests/${request.id}/documents`,
    cookieHeader: cookies.cookieHeader,
    body: formData,
  });

  assertEquals(response.status, 400);
  assertExists(response.body.error);
});

Deno.test({ name: "Documents: POST /api/requests/:id/documents - unauthenticated", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { user } = await createTestUsers();
  const request = await createTestRequest(user.id, "REIMBURSEMENT", "DRAFT");

  const formData = new FormData();
  formData.append("file", new Blob(["test doc"], { type: "text/plain" }), "test.txt");

  const response = await makeRequest(API_BASE, {
    method: "POST",
    path: `/requests/${request.id}/documents`,
    body: formData,
  });

  assertEquals(response.status, 401);
  assertExists(response.body.error);
});

Deno.test({ name: "Documents: POST /api/requests/:id/documents - not owner", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { user, supervisor } = await createTestUsers();
  const request = await createTestRequest(user.id, "REIMBURSEMENT", "DRAFT");
  const supervisorRequest = await createTestRequest(supervisor.id, "REIMBURSEMENT", "DRAFT");

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

  const formData = new FormData();
  formData.append("file", new Blob(["doc"], { type: "text/plain" }), "doc.txt");

  const response = await makeRequest(API_BASE, {
    method: "POST",
    path: `/requests/${request.id}/documents`,
    cookieHeader: cookies.cookieHeader,
    body: formData,
  });

  assertEquals(response.status, 403);
  assertExists(response.body.error);
});

Deno.test({ name: "Documents: POST /api/requests/:id/documents - non-existent request returns 404", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  await delay(500);
  const { user } = await createTestUsers();

  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: { email: user.email, password: user.password },
  });
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));

  const formData = new FormData();
  formData.append("file", new Blob(["test"], { type: "text/plain" }), "test.txt");

  const response = await makeRequest(API_BASE, {
    method: "POST",
    path: "/requests/00000000-0000-0000-0000-000000000000/documents",
    cookieHeader: cookies.cookieHeader,
    body: formData,
  });

  assertEquals(response.status, 404);
  assertExists(response.body.error);
});

Deno.test({ name: "Documents: POST /api/requests/:id/documents - can upload to rejected request", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  await delay(500);
  const { user } = await createTestUsers();
  const request = await createTestRequest(user.id, "REIMBURSEMENT", "SUPERVISOR_REJECTED");

  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: { email: user.email, password: user.password },
  });
  assertEquals(loginResponse.status, 200);
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));

  const formData = new FormData();
  formData.append("file", new Blob(["revised doc"], { type: "text/plain" }), "revised.txt");

  const response = await makeRequest(API_BASE, {
    method: "POST",
    path: `/requests/${request.id}/documents`,
    cookieHeader: cookies.cookieHeader,
    body: formData,
  });

  assertEquals(response.status, 201);
  assertExists(response.body.document);
});

Deno.test({ name: "Documents: GET /api/requests/:id/documents/:docId/url - get download URL", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  await delay(500);
  const { user } = await createTestUsers();
  const request = await createTestRequest(user.id, "REIMBURSEMENT", "DRAFT");
  const doc = await createDocument(request.id, "doc1.pdf", "application/pdf", "file1.pdf", user.id);

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
    method: "GET",
    path: `/requests/${request.id}/documents/${doc.id}/url`,
    cookieHeader: cookies.cookieHeader,
  });

  assertEquals(response.status, 200);
  assertExists(response.body.url);
});

Deno.test({ name: "Documents: GET /api/requests/:id/documents/:docId/url - unauthenticated", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { user } = await createTestUsers();
  const request = await createTestRequest(user.id, "REIMBURSEMENT", "DRAFT");
  const doc = await createDocument(request.id, "doc1.pdf", "application/pdf", "file1.pdf", user.id);

  const response = await makeRequest(API_BASE, {
    method: "GET",
    path: `/requests/${request.id}/documents/${doc.id}/url`,
  });

  assertEquals(response.status, 401);
  assertExists(response.body.error);
});

Deno.test({ name: "Documents: GET /api/requests/:id/documents/:docId/url - non-existent document returns 404", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  await delay(500);
  const { user } = await createTestUsers();
  const request = await createTestRequest(user.id, "REIMBURSEMENT", "DRAFT");

  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: { email: user.email, password: user.password },
  });
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));

  const response = await makeRequest(API_BASE, {
    method: "GET",
    path: `/requests/${request.id}/documents/00000000-0000-0000-0000-000000000000/url`,
    cookieHeader: cookies.cookieHeader,
  });

  assertEquals(response.status, 404);
  assertExists(response.body.error);
});

Deno.test({ name: "Documents: DELETE /api/requests/:id/documents/:docId - delete document", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  await delay(500);
  const { user } = await createTestUsers();
  const request = await createTestRequest(user.id, "REIMBURSEMENT", "DRAFT");
  const doc = await createDocument(request.id, "doc1.pdf", "application/pdf", "file1.pdf", user.id);

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
    method: "DELETE",
    path: `/requests/${request.id}/documents/${doc.id}`,
    cookieHeader: cookies.cookieHeader,
  });

  assertEquals(response.status, 200);
  assertEquals(response.body.success, true);

  const docCheck = await makeRequest(API_BASE, {
    method: "GET",
    path: `/requests/${request.id}/documents/${doc.id}/url`,
    cookieHeader: cookies.cookieHeader,
  });

  assertEquals(docCheck.status, 404);
  assertExists(docCheck.body.error);
});

Deno.test({ name: "Documents: DELETE /api/requests/:id/documents/:docId - non-existent document returns 404", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  await delay(500);
  const { user } = await createTestUsers();
  const request = await createTestRequest(user.id, "REIMBURSEMENT", "DRAFT");

  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: { email: user.email, password: user.password },
  });
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));

  const response = await makeRequest(API_BASE, {
    method: "DELETE",
    path: `/requests/${request.id}/documents/00000000-0000-0000-0000-000000000000`,
    cookieHeader: cookies.cookieHeader,
  });

  assertEquals(response.status, 404);
  assertExists(response.body.error);
});

Deno.test({ name: "Documents: DELETE /api/requests/:id/documents/:docId - unauthenticated", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  const { user } = await createTestUsers();
  const request = await createTestRequest(user.id, "REIMBURSEMENT", "DRAFT");
  const doc = await createDocument(request.id, "doc1.pdf", "application/pdf", "file1.pdf", user.id);

  const response = await makeRequest(API_BASE, {
    method: "DELETE",
    path: `/requests/${request.id}/documents/${doc.id}`,
  });

  assertEquals(response.status, 401);
  assertExists(response.body.error);
});

Deno.test({ name: "Documents: PATCH reimbursement items - shrinking item count deletes orphaned docs and preserves overlap", sanitizeResources: false, sanitizeOps: false }, async () => {
  await cleanupDatabase();
  await delay(500);
  const { user } = await createTestUsers();
  const request = await createTestRequest(user.id, "REIMBURSEMENT", "DRAFT", undefined, {
    reimbursement: {
      items: [
        { description: "early", amount: 10, date: new Date("2026-01-01") },
        { description: "middle", amount: 20, date: new Date("2026-02-01") },
        { description: "late", amount: 30, date: new Date("2026-03-01") },
      ],
    },
  });

  const seeded = await prisma.request.findUnique({
    where: { id: request.id },
    include: { reimbursement: { include: { items: { orderBy: { date: "asc" } } } } },
  });
  const items = seeded!.reimbursement!.items;
  const docEarly = await createDocument(request.id, "early.pdf", "application/pdf", "early-key.pdf", user.id, items[0].id);
  const docMiddle = await createDocument(request.id, "middle.pdf", "application/pdf", "middle-key.pdf", user.id, items[1].id);
  const docLate = await createDocument(request.id, "late.pdf", "application/pdf", "late-key.pdf", user.id, items[2].id);

  const loginResponse = await makeRequest(API_BASE, {
    method: "POST",
    path: "/auth/login",
    body: { email: user.email, password: user.password },
  });
  const cookies = parseSetCookie(loginResponse.headers.get("set-cookie"));

  // Drop the latest item (position 2 by date asc).
  const response = await makeRequest(API_BASE, {
    method: "PATCH",
    path: `/requests/${request.id}`,
    cookieHeader: cookies.cookieHeader,
    body: {
      reimbursement: {
        items: [
          { description: "early", amount: 10, date: new Date("2026-01-01").toISOString() },
          { description: "middle", amount: 20, date: new Date("2026-02-01").toISOString() },
        ],
      },
    },
  });

  assertEquals(response.status, 200);

  // Doc on the dropped item is gone.
  const lateAfter = await prisma.document.findUnique({ where: { id: docLate.id } });
  assertEquals(lateAfter, null);

  // Docs on positions 0 and 1 survive and now reference the recreated items at the same positions.
  const updated = await prisma.request.findUnique({
    where: { id: request.id },
    include: { reimbursement: { include: { items: { orderBy: { date: "asc" } } } } },
  });
  const newItems = updated!.reimbursement!.items;
  assertEquals(newItems.length, 2);

  const earlyAfter = await prisma.document.findUnique({ where: { id: docEarly.id } });
  const middleAfter = await prisma.document.findUnique({ where: { id: docMiddle.id } });
  assertExists(earlyAfter);
  assertExists(middleAfter);
  assertEquals(earlyAfter!.reimbursementItemId, newItems[0].id);
  assertEquals(middleAfter!.reimbursementItemId, newItems[1].id);
});
