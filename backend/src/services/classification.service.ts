import { prisma } from "../lib/prisma.ts";
import { AppError } from "../middleware/error.ts";
import type { Prisma, RequestStatus } from "../generated/prisma/client.ts";

const CLASSIFIABLE_STATUSES: RequestStatus[] = [
  "SUPERVISOR_APPROVED",
  "FINANCE_REVIEWING",
];

type ItemType = "reimbursement" | "travel_advance" | "travel_expense";

type ItemHandler = {
  label: string;
  findRequestId: (id: string) => Promise<{ detail: { requestId: string } } | null>;
  setCode: (id: string, codeSecondaire: string) => Promise<unknown>;
};

const ITEM_HANDLERS: Record<ItemType, ItemHandler> = {
  reimbursement: {
    label: "Reimbursement item",
    findRequestId: (id) =>
      prisma.reimbursementItem.findUnique({
        where: { id },
        select: { detail: { select: { requestId: true } } },
      }),
    setCode: (id, codeSecondaire) =>
      prisma.reimbursementItem.update({ where: { id }, data: { codeSecondaire } }),
  },
  travel_advance: {
    label: "Travel advance item",
    findRequestId: (id) =>
      prisma.travelAdvanceItem.findUnique({
        where: { id },
        select: { detail: { select: { requestId: true } } },
      }),
    setCode: (id, codeSecondaire) =>
      prisma.travelAdvanceItem.update({ where: { id }, data: { codeSecondaire } }),
  },
  travel_expense: {
    label: "Travel expense item",
    findRequestId: (id) =>
      prisma.travelExpenseItem.findUnique({
        where: { id },
        select: { detail: { select: { requestId: true } } },
      }),
    setCode: (id, codeSecondaire) =>
      prisma.travelExpenseItem.update({ where: { id }, data: { codeSecondaire } }),
  },
};

export async function classifyItem(
  requestId: string,
  itemId: string,
  itemType: ItemType,
  codeSecondaire: string,
  _adminId: string,
) {
  const request = await prisma.request.findUnique({ where: { id: requestId } });
  if (!request) throw new AppError(404, "Request not found");
  if (!CLASSIFIABLE_STATUSES.includes(request.status)) {
    throw new AppError(
      400,
      `Cannot classify items on request with status: ${request.status}`,
    );
  }

  const handler = ITEM_HANDLERS[itemType];
  const item = await handler.findRequestId(itemId);
  if (!item || item.detail.requestId !== requestId) {
    throw new AppError(404, `${handler.label} not found in this request`);
  }
  await handler.setCode(itemId, codeSecondaire);

  return { success: true, itemId, codeSecondaire };
}

export async function allItemsClassified(
  requestId: string,
  client: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<boolean> {
  const request = await client.request.findUnique({
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
