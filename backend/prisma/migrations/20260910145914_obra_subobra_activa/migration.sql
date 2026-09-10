-- AlterTable
ALTER TABLE "obras" ADD COLUMN     "activa" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "sub_obras" ADD COLUMN     "activa" BOOLEAN NOT NULL DEFAULT true;
