import { Hono } from "hono";
import * as storageService from "../services/storage.service.ts";
import * as requestService from "../services/request.service.ts";
import { authenticate } from "../middleware/auth.ts";
import { AppError } from "../middleware/error.ts";
import type { HonoEnv } from "../types.ts";

const router = new Hono<HonoEnv>();

router.use("*", authenticate);

router.post("/:id/documents", async (c) => {
  const { id: userId, role } = c.get("user");
  const requestId = c.req.param("id");
  const request = await requestService.getRequest(requestId, userId, role);
  if (request.userId !== userId) {
    throw new AppError(403, "DOCUMENT_OWNER_ONLY_UPLOAD");
  }
  const editableStatuses = ["DRAFT", "SUPERVISOR_REJECTED", "FINANCE_REJECTED"];
  if (!editableStatuses.includes(request.status)) {
    throw new AppError(400, "DOCUMENT_REQUEST_WRONG_STATUS", { status: request.status });
  }
  const formData = await c.req.formData();
  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    throw new AppError(400, "DOCUMENT_FILE_FIELD_REQUIRED");
  }
  const rawItemId = formData.get("itemId");
  const itemId = typeof rawItemId === "string" && rawItemId.length > 0 ? rawItemId : undefined;
  const doc = await storageService.uploadDocument(requestId, file, userId, itemId);
  return c.json({ document: doc }, 201);
});

router.get("/:id/documents/:docId/url", async (c) => {
  const { id: userId, role } = c.get("user");
  const requestId = c.req.param("id");
  const docId = c.req.param("docId");
  await requestService.getRequest(requestId, userId, role);
  const url = await storageService.getDocumentPresignedUrl(docId, requestId);
  return c.json({ url });
});

router.delete("/:id/documents/:docId", async (c) => {
  const { id: userId, role } = c.get("user");
  const requestId = c.req.param("id");
  const docId = c.req.param("docId");
  const request = await requestService.getRequest(requestId, userId, role);
  if (request.userId !== userId) {
    throw new AppError(403, "DOCUMENT_OWNER_ONLY_DELETE");
  }
  await storageService.deleteDocument(docId, requestId);
  return c.json({ success: true });
});

export default router;
