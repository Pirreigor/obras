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

Credenciales admin seed:
- email: admin@obras.local
- password: Admin12345

## Frontend - instalacion

1) `cd frontend && npm install`
2) `npm run dev`

## Endpoints principales

- GET /health
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me
- GET /api/proyectos
- GET /api/proyectos/:id
- POST /api/proyectos
- PATCH /api/proyectos/:id
- DELETE /api/proyectos/:id
- GET /api/proyectos/:id/avances
- POST /api/proyectos/:id/avances
