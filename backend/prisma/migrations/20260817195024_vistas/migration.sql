-- CreateTable
CREATE TABLE "vistas" (
    "id" SERIAL NOT NULL,
    "clave" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vistas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario_vistas" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "vistaId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuario_vistas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vistas_clave_key" ON "vistas"("clave");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_vistas_usuarioId_vistaId_key" ON "usuario_vistas"("usuarioId", "vistaId");

-- AddForeignKey
ALTER TABLE "usuario_vistas" ADD CONSTRAINT "usuario_vistas_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_vistas" ADD CONSTRAINT "usuario_vistas_vistaId_fkey" FOREIGN KEY ("vistaId") REFERENCES "vistas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

