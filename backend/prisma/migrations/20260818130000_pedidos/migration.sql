-- AlterTable
ALTER TABLE "solicitudes" ADD COLUMN     "actividadProgramadaId" INTEGER,
ADD COLUMN     "pedidoId" INTEGER;

-- CreateTable
CREATE TABLE "pedidos" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "factura" TEXT,
    "fechaEstimadaLlegada" TIMESTAMP(3),
    "fechaLlegadaReal" TIMESTAMP(3),
    "creadoPorId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pedidos_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "solicitudes" ADD CONSTRAINT "solicitudes_actividadProgramadaId_fkey" FOREIGN KEY ("actividadProgramadaId") REFERENCES "actividades_programadas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes" ADD CONSTRAINT "solicitudes_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "pedidos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

