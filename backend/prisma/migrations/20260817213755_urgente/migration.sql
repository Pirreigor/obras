-- AlterTable
ALTER TABLE "actividades_programadas" ADD COLUMN     "urgente" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "avances" ADD COLUMN     "fecha" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "titulo" DROP NOT NULL;

