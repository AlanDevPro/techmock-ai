# 🐳 TechMock AI — Frontend Docker Setup

Frontend oficial de **TechMock AI**, construido con **Next.js 15 + TypeScript + TailwindCSS**, preparado para ejecutarse completamente dentro de Docker usando una arquitectura optimizada con `standalone output`.

---

# 📁 Estructura del Proyecto

```bash
Frontend/
│
├── app/
│   ├── (public)/
│   │   ├── page.tsx
│   │   └── auth/
│   │
│   └── (protected)/
│       └── dashboard/
│
│           ├── admin/
│           │   ├── analytics/
│           │   ├── developers/
│           │   ├── interviews/
│           │   ├── notifications/
│           │   ├── questions/
│           │   ├── recrutments/
│           │   └── technologies/
│           │
│           └── developer/
│               ├── ide/
│               ├── profile/
│               ├── interviews/
│               ├── progress/
│               └── rankings/
│
├── components/
│   ├── ui/
│   ├── layout/
│   ├── auth/
│   ├── dashboard/
│   ├── developer/
│   ├── admin/
│   ├── charts/
│   ├── notifications/
│   └── shared/
│
├── lib/
│   └── firebase.ts
│
├── services/
│   └── api.ts
│
├── public/
│
├── docker/
│   └── .gitkeep
│
├── .dockerignore
├── .env.docker
├── .env.example
├── Dockerfile
├── docker-compose.yml
├── docker-compose.dev.yml
├── docker-compose.prod.yml
├── Makefile
├── DOCKER_README.md
├── next.config.ts
├── package.json
├── tsconfig.json
└── tailwind.config.ts
```

---

# 🚀 Tecnologías

- Next.js 15
- React 19
- TypeScript
- TailwindCSS
- Docker
- Docker Compose
- Firebase
- ESLint

---

# ⚙️ Configuración Docker

Este proyecto está preparado para ejecutarse únicamente como frontend dentro de Docker.

No es necesario levantar el backend para ejecutar la aplicación frontend.

---

# 📦 Variables de Entorno

## 1. Crear `.env.docker`

Crea el archivo:

```bash
.env.docker
```

Ejemplo:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000/api/v1

NEXT_PUBLIC_FIREBASE_API_KEY=xxxxxxxx
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=xxxxxxxx
NEXT_PUBLIC_FIREBASE_PROJECT_ID=xxxxxxxx
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=xxxxxxxx
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=xxxxxxxx
NEXT_PUBLIC_FIREBASE_APP_ID=xxxxxxxx
```

---

# 🔥 Archivos Modificados para Docker

## `next.config.ts`

Se agregó:

```ts
output: "standalone"
```

Esto permite:

- Reducir el tamaño de la imagen Docker
- Ejecutar Next.js con:
  
```bash
node server.js
```

- Mejor rendimiento en producción

---

## `lib/firebase.ts`

Firebase ahora usa variables de entorno:

```ts
process.env.NEXT_PUBLIC_FIREBASE_API_KEY
```

---

## `services/api.ts`

La URL del backend ahora se obtiene desde:

```ts
process.env.NEXT_PUBLIC_BACKEND_URL
```

---

# 🐳 Levantar SOLO el Frontend

## 1. Construir el contenedor

```bash
docker compose -f docker-compose.dev.yml build
```

---

## 2. Levantar el frontend

```bash
docker compose -f docker-compose.dev.yml up
```

Frontend disponible en:

```bash
http://localhost:3000
```

---

# 🛠️ Comandos Útiles

## Levantar frontend

```bash
make dev-up
```

---

## Levantar frontend en background

```bash
make dev-up-d
```

---

## Detener frontend

```bash
make dev-down
```

---

## Ver logs en tiempo real

```bash
make dev-logs
```

---

## Rebuild completo sin caché

```bash
make rebuild
```

---

## Entrar al contenedor

```bash
make shell
```

---

## Verificar healthcheck

```bash
make health
```

---

## Limpiar contenedores y volúmenes

```bash
make clean
```

---

# 🧱 Docker Multi-Stage Build

El proyecto utiliza un `Dockerfile` multi-stage optimizado.

Beneficios:

- Imagen liviana
- Mejor rendimiento
- Build más rápido
- Menor consumo de memoria
- Producción optimizada

---

# 📄 `.dockerignore`

El proyecto ignora automáticamente:

```bash
node_modules
.next
.git
Dockerfile
README.md
```

para mejorar la velocidad de build.

---

# 🔍 Troubleshooting

## ❌ Cannot find module

### Solución

Verificar que `next.config.ts` tenga:

```ts
output: "standalone"
```

Luego ejecutar:

```bash
make rebuild
```

---

## ❌ Firebase: app already initialized

Ya corregido usando:

```ts
getApps().length === 0
```

---

## ❌ El frontend no conecta con la API

Verificar:

```env
NEXT_PUBLIC_BACKEND_URL
```

Ejemplo:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000/api/v1
```

---

# 📦 Producción

## Build producción

```bash
docker compose -f docker-compose.prod.yml build
```

---

## Ejecutar producción

```bash
docker compose -f docker-compose.prod.yml up -d
```

---

# 🧹 Recomendaciones

- No subir `.env.docker`
- Sí subir `.env.example`
- Mantener `output: "standalone"`
- Usar `make rebuild` después de modificar Docker
- Mantener las variables `NEXT_PUBLIC_*` centralizadas

---

# 👨‍💻 Desarrollo

Proyecto desarrollado para entrevistas técnicas inteligentes con IA:

- Dashboard Admin
- Dashboard Developer
- Rankings
- Progress Tracking
- IDE Integrado
- Recruitment System
- Notifications
- Analytics

---

# ✅ Estado

Frontend Docker Ready ✅
Next.js Standalone Ready ✅
Production Ready ✅
TypeScript Strict Mode ✅
Optimized Docker Image ✅