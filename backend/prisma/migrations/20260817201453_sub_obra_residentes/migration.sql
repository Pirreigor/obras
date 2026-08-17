-- CreateTable
CREATE TABLE "sub_obra_residentes" (
    "id" SERIAL NOT NULL,
    "subObraId" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sub_obra_residentes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sub_obra_residentes_subObraId_usuarioId_key" ON "sub_obra_residentes"("subObraId", "usuarioId");

-- AddForeignKey
ALTER TABLE "sub_obra_residentes" ADD CONSTRAINT "sub_obra_residentes_subObraId_fkey" FOREIGN KEY ("subObraId") REFERENCES "sub_obras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_obra_residentes" ADD CONSTRAINT "sub_obra_residentes_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

