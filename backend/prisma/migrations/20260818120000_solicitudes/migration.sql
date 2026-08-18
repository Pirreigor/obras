-- CreateEnum
CREATE TYPE "TipoSolicitud" AS ENUM ('MATERIAL', 'MAQUINARIA', 'RECURSO', 'ESPECIALISTA');

-- CreateEnum
CREATE TYPE "EstadoSolicitud" AS ENUM ('SOLICITADO', 'APROBADO', 'RECHAZADO', 'RESUELTO');

-- DropForeignKey
ALTER TABLE "pedido_item_sub_obras" DROP CONSTRAINT "pedido_item_sub_obras_pedidoMaterialItemId_fkey";

-- DropForeignKey
ALTER TABLE "pedido_item_sub_obras" DROP CONSTRAINT "pedido_item_sub_obras_subObraId_fkey";

-- DropForeignKey
ALTER TABLE "pedido_material_items" DROP CONSTRAINT "pedido_material_items_materialCatalogoId_fkey";

-- DropForeignKey
ALTER TABLE "pedido_material_items" DROP CONSTRAINT "pedido_material_items_pedidoId_fkey";

-- DropForeignKey
ALTER TABLE "pedidos_material" DROP CONSTRAINT "pedidos_material_creadoPorId_fkey";

-- DropTable
DROP TABLE "pedido_item_sub_obras";

-- DropTable
DROP TABLE "pedido_material_items";

-- DropTable
DROP TABLE "pedidos_material";

-- DropEnum
DROP TYPE "EstadoPedido";

-- CreateTable
CREATE TABLE "solicitudes" (
    "id" SERIAL NOT NULL,
    "subObraId" INTEGER NOT NULL,
    "tipo" "TipoSolicitud" NOT NULL,
    "materialCatalogoId" INTEGER,
    "descripcion" TEXT,
    "cantidad" DOUBLE PRECISION,
    "fechaNecesaria" TIMESTAMP(3),
    "urgente" BOOLEAN NOT NULL DEFAULT false,
    "estado" "EstadoSolicitud" NOT NULL DEFAULT 'SOLICITADO',
    "creadoPorId" INTEGER,
    "aprobadoPorId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solicitudes_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "solicitudes" ADD CONSTRAINT "solicitudes_subObraId_fkey" FOREIGN KEY ("subObraId") REFERENCES "sub_obras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes" ADD CONSTRAINT "solicitudes_materialCatalogoId_fkey" FOREIGN KEY ("materialCatalogoId") REFERENCES "materiales_catalogo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes" ADD CONSTRAINT "solicitudes_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes" ADD CONSTRAINT "solicitudes_aprobadoPorId_fkey" FOREIGN KEY ("aprobadoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

