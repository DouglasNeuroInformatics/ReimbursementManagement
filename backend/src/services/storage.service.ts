import { prisma } from "../lib/prisma.ts";
import { putObject, deleteObject, getPresignedDownloadUrl } from "../lib/s3.ts";
import { AppError } from "../middleware/error.ts";

export const MAX_FILE_SIZE = 50 * 1024 * 1024;

export const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
]);

export async function uploadDocument(
  requestId: string,
  file: File,
  uploadedBy: string,
  reimbursementItemId?: string,
) {
  if (file.size > MAX_FILE_SIZE) {
    throw new AppError(
      400,
      `File exceeds maximum size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    );
  }
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new AppError(400, `File type '${file.type}' is not allowed`);
  }

  if (reimbursementItemId) {
    const item = await prisma.reimbursementItem.findFirst({
      where: { id: reimbursementItemId, detail: { requestId } },
    });
    if (!item) {
      throw new AppError(400, "Item does not belong to this request");
    }
  }

  const docId = crypto.randomUUID();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const s3Key = `requests/${requestId}/${docId}-${safeName}`;

  const buffer = await file.arrayBuffer();
  await putObject(s3Key, new Uint8Array(buffer), file.type, file.size);

  try {
    return await prisma.document.create({
      data: {
        id: docId,
        requestId,
        filename: file.name,
        s3Key,
        contentType: file.type,
        sizeBytes: file.size,
        uploadedBy,
        ...(reimbursementItemId ? { reimbursementItemId } : {}),
      },
    });
  } catch (err) {
    try { await deleteObject(s3Key); } catch { /* best-effort cleanup */ }
    throw err;
  }
}

export async function getDocumentPresignedUrl(
  docId: string,
  requestId: string,
): Promise<string> {
  const doc = await prisma.document.findFirst({
    where: { id: docId, requestId },
  });
  if (!doc) throw new AppError(404, "Document not found");
  return getPresignedDownloadUrl(doc.s3Key, 300);
}

export async function deleteDocument(
  docId: string,
  requestId: string,
): Promise<void> {
  const doc = await prisma.document.findFirst({
    where: { id: docId, requestId },
  });
  if (!doc) throw new AppError(404, "Document not found");
  await deleteObject(doc.s3Key);
  await prisma.document.delete({ where: { id: docId } });
}

export async function deleteRequestDocuments(requestId: string): Promise<void> {
  const docs = await prisma.document.findMany({ where: { requestId } });
  for (const doc of docs) {
    try {
      await deleteObject(doc.s3Key);
    } catch (err) {
      console.error(`Failed to delete S3 object ${doc.s3Key}:`, err);
    }
  }
  await prisma.document.deleteMany({ where: { requestId } });
}
