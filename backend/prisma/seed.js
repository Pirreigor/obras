const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const superadminEmail = "superadmin@obras.local";
  const superadminPasswordHash = await bcrypt.hash("Superadmin12345", 10);

  await prisma.usuario.upsert({
    where: { email: superadminEmail },
    update: {},
    create: {
      name: "Super Administrador",
      email: superadminEmail,
      passwordHash: superadminPasswordHash,
      rol: "SUPERADMINISTRADOR",
    },
  });

  const empresa = await prisma.empresa.upsert({
    where: { nombre: "JJAM" },
    update: {},
    create: { nombre: "JJAM" },
  });

  const adminEmail = "admin@obras.local";
  const adminPasswordHash = await bcrypt.hash("Admin12345", 10);

  const admin = await prisma.usuario.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      empresaId: empresa.id,
      name: "Admin JJAM",
      email: adminEmail,
      passwordHash: adminPasswordHash,
      rol: "ADMINISTRADOR",
    },
  });

  const vistaEquipo = await prisma.vista.upsert({
    where: { clave: "equipo" },
    update: {},
    create: { clave: "equipo", nombre: "Equipo" },
  });

  await prisma.usuarioVista.upsert({
    where: { usuarioId_vistaId: { usuarioId: admin.id, vistaId: vistaEquipo.id } },
    update: {},
    create: { usuarioId: admin.id, vistaId: vistaEquipo.id },
  });

  console.log("Seed completa");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
