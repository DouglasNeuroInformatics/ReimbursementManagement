import { assertEquals, assertExists } from "jsr:@std/assert";
import { cleanupDatabase, createTestUsers, createTestRequest, createDocument, makeRequest, parseSetCookie, delay, prisma } from "./test-utils.ts";
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
