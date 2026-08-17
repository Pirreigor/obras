-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('SUPERADMINISTRADOR', 'ADMINISTRADOR', 'SUPERVISOR', 'RESIDENTE', 'CALIDAD_PRODUCCION');

-- CreateEnum
CREATE TYPE "EstadoObra" AS ENUM ('PLANIFICACION', 'EN_PROGRESO', 'PAUSADO', 'FINALIZADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "EstadoSubObra" AS ENUM ('ACTIVA', 'PAUSADA', 'CERRADA');

-- CreateEnum
CREATE TYPE "EstadoActividad" AS ENUM ('PENDIENTE', 'EN_CURSO', 'HECHA');

-- CreateEnum
CREATE TYPE "EstadoPedido" AS ENUM ('SOLICITADO', 'APROBADO', 'COMPRADO_EN_CAMINO', 'RECIBIDO');

-- CreateEnum
CREATE TYPE "EstadoInvitacion" AS ENUM ('PENDIENTE', 'ACEPTADA', 'EXPIRADA', 'REVOCADA');

-- CreateTable
CREATE TABLE "empresas" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empresas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "rol" "Rol" NOT NULL DEFAULT 'CALIDAD_PRODUCCION',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitaciones" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "rol" "Rol" NOT NULL,
    "token" TEXT NOT NULL,
    "estado" "EstadoInvitacion" NOT NULL DEFAULT 'PENDIENTE',
    "invitadoPorId" INTEGER,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invitaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zonas" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zonas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "localidades" (
    "id" SERIAL NOT NULL,
    "zonaId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "localidades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "obras" (
    "id" SERIAL NOT NULL,
    "localidadId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "cliente" TEXT,
    "direccion" TEXT,
    "estado" "EstadoObra" NOT NULL DEFAULT 'PLANIFICACION',
    "presupuesto" DOUBLE PRECISION,
    "fechaInicio" TIMESTAMP(3),
    "fechaFinEstimada" TIMESTAMP(3),
    "residenteId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "obras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sub_obras" (
    "id" SERIAL NOT NULL,
    "obraId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "estado" "EstadoSubObra" NOT NULL DEFAULT 'ACTIVA',
    "responsableCalidadId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sub_obras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actividades_catalogo" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "unidad" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "actividades_catalogo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actividades_programadas" (
    "id" SERIAL NOT NULL,
    "subObraId" INTEGER NOT NULL,
    "actividadCatalogoId" INTEGER NOT NULL,
    "fechaInicioPlan" TIMESTAMP(3),
    "fechaFinPlan" TIMESTAMP(3),
    "estado" "EstadoActividad" NOT NULL DEFAULT 'PENDIENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "actividades_programadas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registros_diarios" (
    "id" SERIAL NOT NULL,
    "actividadProgramadaId" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "comentario" TEXT,
    "creadoPorId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registros_diarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "avances" (
    "id" SERIAL NOT NULL,
    "subObraId" INTEGER NOT NULL,
    "actividadProgramadaId" INTEGER,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "porcentaje" INTEGER NOT NULL DEFAULT 0,
    "imagenes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "creadoPorId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "avances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materiales_catalogo" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "unidadMedida" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "materiales_catalogo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedidos_material" (
    "id" SERIAL NOT NULL,
    "creadoPorId" INTEGER,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "urgente" BOOLEAN NOT NULL DEFAULT false,
    "estado" "EstadoPedido" NOT NULL DEFAULT 'SOLICITADO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pedidos_material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedido_material_items" (
    "id" SERIAL NOT NULL,
    "pedidoId" INTEGER NOT NULL,
    "materialCatalogoId" INTEGER NOT NULL,
    "cantidadTotal" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pedido_material_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedido_item_sub_obras" (
    "id" SERIAL NOT NULL,
    "pedidoMaterialItemId" INTEGER NOT NULL,
    "subObraId" INTEGER NOT NULL,
    "cantidadAsignada" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "pedido_item_sub_obras_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "empresas_nombre_key" ON "empresas"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "invitaciones_token_key" ON "invitaciones"("token");

-- CreateIndex
CREATE UNIQUE INDEX "zonas_empresaId_nombre_key" ON "zonas"("empresaId", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "actividades_catalogo_empresaId_nombre_key" ON "actividades_catalogo"("empresaId", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "registros_diarios_actividadProgramadaId_fecha_key" ON "registros_diarios"("actividadProgramadaId", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "materiales_catalogo_empresaId_nombre_key" ON "materiales_catalogo"("empresaId", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "pedido_item_sub_obras_pedidoMaterialItemId_subObraId_key" ON "pedido_item_sub_obras"("pedidoMaterialItemId", "subObraId");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitaciones" ADD CONSTRAINT "invitaciones_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitaciones" ADD CONSTRAINT "invitaciones_invitadoPorId_fkey" FOREIGN KEY ("invitadoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zonas" ADD CONSTRAINT "zonas_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "localidades" ADD CONSTRAINT "localidades_zonaId_fkey" FOREIGN KEY ("zonaId") REFERENCES "zonas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "obras" ADD CONSTRAINT "obras_localidadId_fkey" FOREIGN KEY ("localidadId") REFERENCES "localidades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "obras" ADD CONSTRAINT "obras_residenteId_fkey" FOREIGN KEY ("residenteId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_obras" ADD CONSTRAINT "sub_obras_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "obras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_obras" ADD CONSTRAINT "sub_obras_responsableCalidadId_fkey" FOREIGN KEY ("responsableCalidadId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actividades_catalogo" ADD CONSTRAINT "actividades_catalogo_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actividades_programadas" ADD CONSTRAINT "actividades_programadas_subObraId_fkey" FOREIGN KEY ("subObraId") REFERENCES "sub_obras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actividades_programadas" ADD CONSTRAINT "actividades_programadas_actividadCatalogoId_fkey" FOREIGN KEY ("actividadCatalogoId") REFERENCES "actividades_catalogo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_diarios" ADD CONSTRAINT "registros_diarios_actividadProgramadaId_fkey" FOREIGN KEY ("actividadProgramadaId") REFERENCES "actividades_programadas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_diarios" ADD CONSTRAINT "registros_diarios_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avances" ADD CONSTRAINT "avances_subObraId_fkey" FOREIGN KEY ("subObraId") REFERENCES "sub_obras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avances" ADD CONSTRAINT "avances_actividadProgramadaId_fkey" FOREIGN KEY ("actividadProgramadaId") REFERENCES "actividades_programadas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avances" ADD CONSTRAINT "avances_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materiales_catalogo" ADD CONSTRAINT "materiales_catalogo_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos_material" ADD CONSTRAINT "pedidos_material_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_material_items" ADD CONSTRAINT "pedido_material_items_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "pedidos_material"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_material_items" ADD CONSTRAINT "pedido_material_items_materialCatalogoId_fkey" FOREIGN KEY ("materialCatalogoId") REFERENCES "materiales_catalogo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_item_sub_obras" ADD CONSTRAINT "pedido_item_sub_obras_pedidoMaterialItemId_fkey" FOREIGN KEY ("pedidoMaterialItemId") REFERENCES "pedido_material_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_item_sub_obras" ADD CONSTRAINT "pedido_item_sub_obras_subObraId_fkey" FOREIGN KEY ("subObraId") REFERENCES "sub_obras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

