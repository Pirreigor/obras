# Obras - Seguimiento de proyectos de construccion

Sistema independiente para la constructora, separado del proyecto de joyeria
(otro repo, otra base de datos, otro dominio: obras.donjoyero.com).

## Estructura

- `backend/` - API Node/Express + Prisma
- `frontend/` - React + Vite

## Backend - instalacion

1) Copiar `backend/.env.example` a `backend/.env` y completar `DATABASE_URL` (base de datos nueva, no la de joyeria) y `JWT_SECRET`
2) `cd backend && npm install`
3) `npm run prisma:migrate -- --name init`
4) `npm run prisma:generate`
5) `npm run seed`
6) `npm run dev`

Credenciales de prueba (seed):
- superadministrador (gestiona empresas): superadmin@obras.local / Superadmin12345
- administrador de la empresa "JJAM": admin@obras.local / Admin12345

## Frontend - instalacion

1) `cd frontend && npm install`
2) `npm run dev`

## Endpoints principales

Sistema multi-empresa: cada usuario (salvo SUPERADMINISTRADOR) pertenece a una
Empresa, y todo lo que ve/crea queda filtrado a esa empresa.

- GET /health
- POST /api/auth/login
- GET /api/auth/me
- POST /api/auth/invitaciones (ADMINISTRADOR o SUPERVISOR invitan por email; el
  envio real del correo todavia no esta conectado a un proveedor)
- GET /api/auth/invitaciones (ADMINISTRADOR o SUPERVISOR, invitaciones de su empresa)
- DELETE /api/auth/invitaciones/:id (ADMINISTRADOR o SUPERVISOR, revoca una pendiente)
- POST /api/auth/aceptar-invitacion (publico, con el token de la invitacion)
- GET /api/empresas (SUPERADMINISTRADOR)
- POST /api/empresas (SUPERADMINISTRADOR, crea la empresa + su primer ADMINISTRADOR)
- GET /api/usuarios (ADMINISTRADOR o SUPERVISOR, equipo de su empresa)
- GET /api/zonas
- POST /api/zonas (ADMINISTRADOR)
- GET /api/zonas/:id/localidades
- POST /api/zonas/:id/localidades (ADMINISTRADOR)
- GET /api/obras
- GET /api/obras/:id
- POST /api/obras (ADMINISTRADOR)
- PATCH /api/obras/:id (ADMINISTRADOR)
- DELETE /api/obras/:id (ADMINISTRADOR)
- GET /api/obras/:id/sub-obras
- POST /api/obras/:id/sub-obras (ADMINISTRADOR)
- GET /api/sub-obras/:id
- PATCH /api/sub-obras/:id (ADMINISTRADOR)
- DELETE /api/sub-obras/:id (ADMINISTRADOR)
- GET /api/sub-obras/:id/avances
- POST /api/sub-obras/:id/avances (ADMINISTRADOR, RESIDENTE o CALIDAD_PRODUCCION)

Todavia sin endpoints: cronograma (ActividadCatalogo/Programada/RegistroDiario)
y pedidos de material (PedidoMaterial y afines) - el schema ya los soporta.
