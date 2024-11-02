/*
  Warnings:

  - Added the required column `amount` to the `Challenge` table without a default value. This is not possible if the table is not empty.
  - Added the required column `token` to the `Challenge` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Challenge" ADD COLUMN     "amount" INTEGER NOT NULL,
ADD COLUMN     "token" TEXT NOT NULL;
