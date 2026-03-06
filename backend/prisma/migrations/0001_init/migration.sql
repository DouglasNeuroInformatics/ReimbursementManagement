-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'SUPERVISOR', 'FINANCIAL_ADMIN');

-- CreateEnum
CREATE TYPE "RequestType" AS ENUM ('REIMBURSEMENT', 'TRAVEL_ADVANCE', 'TRAVEL_REIMBURSEMENT');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'SUPERVISOR_APPROVED', 'SUPERVISOR_REJECTED', 'FINANCE_APPROVED', 'FINANCE_REJECTED', 'PAID');

-- CreateEnum
CREATE TYPE "ApprovalAction" AS ENUM ('APPROVE', 'REJECT', 'REQUEST_CHANGES', 'PAID');

-- CreateEnum
CREATE TYPE "ApprovalStage" AS ENUM ('SUPERVISOR', 'FINANCE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "jobPosition" TEXT,
    "phone" TEXT,
    "extension" TEXT,
    "address" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "supervisorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupervisorAccount" (
    "id" TEXT NOT NULL,
    "supervisorId" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupervisorAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Request" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "RequestType" NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReimbursementDetail" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,

    CONSTRAINT "ReimbursementDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReimbursementItem" (
    "id" TEXT NOT NULL,
    "detailId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "vendor" TEXT,
    "notes" TEXT,

    CONSTRAINT "ReimbursementItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TravelAdvanceDetail" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "departureDate" TIMESTAMP(3) NOT NULL,
    "returnDate" TIMESTAMP(3) NOT NULL,
    "estimatedAmount" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "TravelAdvanceDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TravelAdvanceItem" (
    "id" TEXT NOT NULL,
    "detailId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "TravelAdvanceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TravelReimbursementDetail" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "departureDate" TIMESTAMP(3) NOT NULL,
    "returnDate" TIMESTAMP(3) NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "advanceRequestId" TEXT,

    CONSTRAINT "TravelReimbursementDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TravelExpenseItem" (
    "id" TEXT NOT NULL,
    "detailId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "vendor" TEXT,
    "notes" TEXT,

    CONSTRAINT "TravelExpenseItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "reimbursementItemId" TEXT,
    "filename" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedBy" TEXT NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Approval" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" "ApprovalAction" NOT NULL,
    "stage" "ApprovalStage" NOT NULL,
    "comment" TEXT,
    "accountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Approval_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "SupervisorAccount_supervisorId_accountNumber_key" ON "SupervisorAccount"("supervisorId", "accountNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "ReimbursementDetail_requestId_key" ON "ReimbursementDetail"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "TravelAdvanceDetail_requestId_key" ON "TravelAdvanceDetail"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "TravelReimbursementDetail_requestId_key" ON "TravelReimbursementDetail"("requestId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupervisorAccount" ADD CONSTRAINT "SupervisorAccount_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReimbursementDetail" ADD CONSTRAINT "ReimbursementDetail_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReimbursementItem" ADD CONSTRAINT "ReimbursementItem_detailId_fkey" FOREIGN KEY ("detailId") REFERENCES "ReimbursementDetail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelAdvanceDetail" ADD CONSTRAINT "TravelAdvanceDetail_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelAdvanceItem" ADD CONSTRAINT "TravelAdvanceItem_detailId_fkey" FOREIGN KEY ("detailId") REFERENCES "TravelAdvanceDetail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelReimbursementDetail" ADD CONSTRAINT "TravelReimbursementDetail_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelExpenseItem" ADD CONSTRAINT "TravelExpenseItem_detailId_fkey" FOREIGN KEY ("detailId") REFERENCES "TravelReimbursementDetail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_reimbursementItemId_fkey" FOREIGN KEY ("reimbursementItemId") REFERENCES "ReimbursementItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "SupervisorAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
