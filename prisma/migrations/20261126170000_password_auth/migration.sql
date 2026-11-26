-- AlterEnum
ALTER TYPE "AuthMethod" ADD VALUE 'EMAIL_PASSWORD';
ALTER TYPE "AuthMethod" ADD VALUE 'PHONE_PASSCODE';

-- AlterTable
ALTER TABLE "users" ADD COLUMN "passwordHash" TEXT,
ADD COLUMN "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "lockedUntil" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "app_secrets" (
    "name" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_secrets_pkey" PRIMARY KEY ("name")
);
