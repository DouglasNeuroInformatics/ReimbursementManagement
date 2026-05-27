import { prisma } from "../lib/prisma.ts";
import { AppError } from "../middleware/error.ts";
import type { RequestStatus } from "../generated/prisma/client.ts";

const CLASSIFIABLE_STATUSES: RequestStatus[] = [
  "SUPERVISOR_APPROVED",
  "FINANCE_REVIEWING",
];

type ItemType = "reimbursement" | "travel_advance" | "travel_expense";

export async function classifyItem(
  requestId: string,
  itemId: string,
  itemType: ItemType,
  codeSecondaire: string,
  adminId: string,
) {
  const request = await prisma.request.findUnique({ where: { id: requestId } });
  if (!request) throw new AppError(404, "Request not found");
  if (!CLASSIFIABLE_STATUSES.includes(request.status)) {
    throw new AppError(
      400,
      `Cannot classify items on request with status: ${request.status}`,
    );
  }

  if (itemType === "reimbursement") {
    const item = await prisma.reimbursementItem.findUnique({
      where: { id: itemId },
      include: { detail: { select: { requestId: true } } },
    });
    if (!item || item.detail.requestId !== requestId) {
      throw new AppError(404, "Reimbursement item not found in this request");
    }
    await prisma.reimbursementItem.update({
      where: { id: itemId },
      data: { codeSecondaire },
    });
  } else if (itemType === "travel_advance") {
    const item = await prisma.travelAdvanceItem.findUnique({
      where: { id: itemId },
      include: { detail: { select: { requestId: true } } },
    });
    if (!item || item.detail.requestId !== requestId) {
      throw new AppError(404, "Travel advance item not found in this request");
    }
    await prisma.travelAdvanceItem.update({
      where: { id: itemId },
      data: { codeSecondaire },
    });
  } else if (itemType === "travel_expense") {
    const item = await prisma.travelExpenseItem.findUnique({
      where: { id: itemId },
      include: { detail: { select: { requestId: true } } },
    });
    if (!item || item.detail.requestId !== requestId) {
      throw new AppError(
        404,
        "Travel expense item not found in this request",
      );
    }
    await prisma.travelExpenseItem.update({
      where: { id: itemId },
      data: { codeSecondaire },
    });
  }

  return { success: true, itemId, codeSecondaire };
}

export async function allItemsClassified(
  requestId: string,
): Promise<boolean> {
  const request = await prisma.request.findUnique({
    where: { id: requestId },
    include: {
      reimbursement: { include: { items: true } },
      travelAdvance: { include: { items: true } },
      travelReimbursement: { include: { items: true } },
    },
  });
  if (!request) return false;

  const items = [
    ...(request.reimbursement?.items ?? []),
    ...(request.travelAdvance?.items ?? []),
    ...(request.travelReimbursement?.items ?? []),
  ];

  if (items.length === 0) return true;
  return items.every((item) => item.codeSecondaire !== null);
}
