# Next.js — Base de Conocimiento para Entrevistas Técnicas

## ¿Qué es este archivo y para qué sirve?

Este archivo alimenta el sistema RAG con conocimiento técnico de Next.js. El pipeline de ingestion lo fragmenta, vectoriza y almacena en OpenSearch. Cuando el sistema genera una pregunta de entrevista sobre Next.js, el retriever recupera los fragmentos más relevantes y el LLM los usa como contexto para crear preguntas técnicas precisas y actualizadas.

---

## App Router vs Pages Router

### Pages Router (Next.js clásico, hasta v12)

El sistema de rutas basado en archivos dentro de `/pages`. Cada archivo es una ruta. Simple pero con limitaciones para layouts compartidos y Server Components.

```
pages/
  index.js          → /
  about.js          → /about
  blog/
    index.js        → /blog
    [slug].js       → /blog/:slug
  api/
    users.js        → /api/users
```

### App Router (Next.js 13+ recomendado)

Nuevo sistema basado en `/app`. Soporta React Server Components por defecto, layouts anidados, loading y error boundaries nativos, y parallel routes.

```
app/
  layout.js         → Layout raíz (siempre renderizado)
  page.js           → /
  about/
    page.js         → /about
  blog/
    layout.js       → Layout solo para /blog/*
    page.js         → /blog
    [slug]/
      page.js       → /blog/:slug
      loading.js    → UI de carga automática
      error.js      → Manejo de errores automático
  (dashboard)/      → Grupo de rutas sin segmento en URL
    settings/page.js → /settings
    profile/page.js  → /profile
  api/
    users/route.js  → /api/users (Route Handlers)
```

---

## Server Components vs Client Components

Este es el concepto más importante de Next.js moderno y el más evaluado en entrevistas.

### Server Components (por defecto en App Router)

Se renderizan en el servidor. Pueden acceder directamente a bases de datos, sistemas de archivos, y APIs internas. No tienen estado interactivo ni hooks de React. Reducen el JavaScript enviado al cliente.

```javascript
// app/productos/page.js — Server Component por defecto
// NO necesita 'use client'

async function PaginaProductos() {
  // Fetch directo en el servidor — NO expone API keys al cliente
  const productos = await fetch('https://api.interna.com/productos', {
    headers: { Authorization: `Bearer ${process.env.API_SECRET}` },
    // next.revalidate controla el cache
    next: { revalidate: 3600 } // revalidar cada hora
  }).then(r => r.json())

  return (
    <ul>
      {productos.map(p => (
        <li key={p.id}>{p.nombre} — ${p.precio}</li>
      ))}
    </ul>
  )
}

export default PaginaProductos
```

### Client Components

Necesitan `'use client'` al inicio del archivo. Tienen acceso a hooks de React, eventos del browser, localStorage, y APIs del DOM. Se hidrata en el cliente.

```javascript
'use client'

import { useState, useEffect } from 'react'

function ContadorInteractivo({ valorInicial }) {
  const [contador, setContador] = useState(valorInicial)
  const [historial, setHistorial] = useState([])

  const incrementar = () => {
    setContador(prev => {
      const nuevo = prev + 1
      setHistorial(h => [...h, nuevo])
      return nuevo
    })
  }

  // useEffect disponible solo en Client Components
  useEffect(() => {
    document.title = `Contador: ${contador}`
  }, [contador])

  return (
    <div>
      <p>Valor: {contador}</p>
      <button onClick={incrementar}>+1</button>
    </div>
  )
}
```

### Patrón correcto: composición Server + Client

El error más común es marcar todo como Client Component por comodidad, perdiendo las ventajas del servidor.

```javascript
// ✅ CORRECTO: Server Component que compone Client Components
// app/dashboard/page.js — Server Component
import Grafica from './Grafica' // Client Component (necesita canvas)
import TarjetaResumen from './TarjetaResumen' // Server Component

async function Dashboard() {
  // Datos en el servidor
  const estadisticas = await obtenerEstadisticasDB()
  const usuario = await obtenerUsuarioActual()

  return (
    <div>
      <TarjetaResumen datos={estadisticas} usuario={usuario} />
      {/* Pasar datos como props al Client Component */}
      <Grafica datos={estadisticas.ventas} />
    </div>
  )
}
```

---

## Estrategias de Renderizado y Cache

### Static Site Generation (SSG)

Genera HTML en tiempo de build. Ideal para contenido que no cambia frecuentemente.

```javascript
// App Router: fetch sin revalidate = estático por defecto
async function BlogPost({ params }) {
  const post = await fetch(`/api/posts/${params.slug}`, {
    cache: 'force-cache' // Explícito: cachear indefinidamente
  }).then(r => r.json())

  return <article>{post.contenido}</article>
}

// Generar rutas estáticas en build time
export async function generateStaticParams() {
  const posts = await fetch('/api/posts').then(r => r.json())
  return posts.map(post => ({ slug: post.slug }))
}
```

### Incremental Static Regeneration (ISR)

Regenera páginas estáticas en el background después de un tiempo de revalidación.

```javascript
async function Productos() {
  const productos = await fetch('/api/productos', {
    next: { revalidate: 60 } // Revalidar cada 60 segundos
  }).then(r => r.json())

  return <ListaProductos items={productos} />
}

// Revalidación bajo demanda (On-demand ISR)
// app/api/revalidar/route.js
import { revalidatePath, revalidateTag } from 'next/cache'

export async function POST(request) {
  const { path, tag, secret } = await request.json()

  if (secret !== process.env.REVALIDATE_SECRET) {
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  }

  if (tag) revalidateTag(tag)
  if (path) revalidatePath(path)

  return Response.json({ revalidated: true })
}
```

### Server-Side Rendering (SSR)

Renderiza en cada request. Para datos que deben ser frescos en cada visita.

```javascript
// Forzar renderizado dinámico en App Router
export const dynamic = 'force-dynamic'

async function PaginaDinamica() {
  // Se ejecuta en cada request
  const datos = await fetch('/api/tiempo-real', { cache: 'no-store' })
    .then(r => r.json())

  return <Dashboard datos={datos} />
}
```

---

## Route Handlers (API Routes en App Router)

Reemplazan las API Routes de `/pages/api/`. Soportan todos los métodos HTTP y son Server Components por naturaleza.

```javascript
// app/api/usuarios/route.js
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const esquemaUsuario = z.object({
  nombre: z.string().min(2),
  email:  z.string().email(),
  edad:   z.number().min(18)
})

// GET /api/usuarios
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const pagina   = parseInt(searchParams.get('pagina') || '1')
  const limite   = parseInt(searchParams.get('limite') || '10')

  const usuarios = await db.usuario.findMany({
    skip: (pagina - 1) * limite,
    take: limite,
  })

  return NextResponse.json({ usuarios, pagina, limite })
}

// POST /api/usuarios
export async function POST(request) {
  const body = await request.json()

  // Validación con Zod
  const resultado = esquemaUsuario.safeParse(body)
  if (!resultado.success) {
    return NextResponse.json(
      { error: resultado.error.flatten() },
      { status: 400 }
    )
  }

  const usuario = await db.usuario.create({ data: resultado.data })
  return NextResponse.json(usuario, { status: 201 })
}

// app/api/usuarios/[id]/route.js — ruta dinámica
export async function GET(request, { params }) {
  const usuario = await db.usuario.findUnique({
    where: { id: params.id }
  })

  if (!usuario) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  }

  return NextResponse.json(usuario)
}
```

---

## Metadata y SEO

```javascript
// Metadata estática
export const metadata = {
  title: 'Mi Aplicación',
  description: 'Descripción para SEO',
  openGraph: {
    title: 'Mi Aplicación',
    description: 'Descripción para redes sociales',
    images: ['/og-image.png'],
  },
}

// Metadata dinámica
export async function generateMetadata({ params }) {
  const producto = await fetch(`/api/productos/${params.id}`).then(r => r.json())

  return {
    title: `${producto.nombre} | Tienda`,
    description: producto.descripcion,
    openGraph: {
      images: [producto.imagen],
    },
  }
}
```

---

## Middleware

Se ejecuta antes de que la request llegue al componente. Ideal para autenticación, redirecciones, A/B testing, geolocalización.

```javascript
// middleware.js (en la raíz del proyecto)
import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

export async function middleware(request) {
  const { pathname } = request.nextUrl

  // Rutas que requieren autenticación
  const rutasProtegidas = ['/dashboard', '/perfil', '/admin']
  const requiereAuth = rutasProtegidas.some(ruta => pathname.startsWith(ruta))

  if (requiereAuth) {
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    try {
      await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET))
      return NextResponse.next()
    } catch {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

// Definir en qué rutas ejecutar el middleware
export const config = {
  matcher: ['/dashboard/:path*', '/perfil/:path*', '/admin/:path*']
}
```

---

## Optimización de Imágenes y Fuentes

```javascript
// Componente Image optimizado
import Image from 'next/image'

function HeroSection() {
  return (
    <div style={{ position: 'relative', width: '100%', height: '500px' }}>
      {/* Next/Image previene CLS, convierte a WebP, lazy load automático */}
      <Image
        src="/hero.jpg"
        alt="Hero"
        fill
        style={{ objectFit: 'cover' }}
        priority // Cargar con prioridad (above the fold)
        sizes="(max-width: 768px) 100vw, 50vw"
      />
    </div>
  )
}

// Fuentes optimizadas — zero layout shift
import { Inter, Roboto_Mono } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

// app/layout.js
export default function RootLayout({ children }) {
  return (
    <html lang="es" className={inter.variable}>
      <body>{children}</body>
    </html>
  )
}
```

---

## Server Actions

Funciones del servidor que se pueden llamar directamente desde Client Components. Eliminan la necesidad de Route Handlers para mutaciones simples.

```javascript
// app/actions/usuario.js
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function actualizarPerfil(formData) {
  const nombre = formData.get('nombre')
  const bio    = formData.get('bio')

  // Validación en el servidor
  if (!nombre || nombre.length < 2) {
    return { error: 'Nombre demasiado corto' }
  }

  await db.usuario.update({
    where: { id: obtenerUsuarioActual().id },
    data: { nombre, bio }
  })

  revalidatePath('/perfil')
  return { success: true }
}

// Client Component usando Server Action
'use client'
import { actualizarPerfil } from '../actions/usuario'
import { useFormState } from 'react-dom'

function FormularioPerfil() {
  const [estado, accion] = useFormState(actualizarPerfil, null)

  return (
    <form action={accion}>
      <input name="nombre" required />
      <textarea name="bio" />
      {estado?.error && <p className="error">{estado.error}</p>}
      <button type="submit">Guardar</button>
    </form>
  )
}
```

---

## Errores Comunes en Next.js

### Error 1: Usar `useRouter` de `next/router` en App Router

```javascript
// ❌ MAL en App Router
import { useRouter } from 'next/router' // Solo para Pages Router

// ✅ BIEN en App Router
import { useRouter } from 'next/navigation'
import { usePathname, useSearchParams } from 'next/navigation'
```

### Error 2: Fetch sin estrategia de cache explícita

```javascript
// ❌ MAL - comportamiento de cache no predecible
const datos = await fetch('/api/datos')

// ✅ BIEN - estrategia de cache explícita
const datos = await fetch('/api/datos', { cache: 'no-store' })        // Siempre fresco
const datos = await fetch('/api/datos', { next: { revalidate: 60 } }) // ISR
const datos = await fetch('/api/datos', { cache: 'force-cache' })     // Estático
```

### Error 3: Marcar componentes como Client innecesariamente

```javascript
// ❌ MAL - todo el componente como client solo por un botón
'use client'
async function Pagina() { /* componente grande con fetch */ }

// ✅ BIEN - aislar solo la parte interactiva
// Pagina.js (Server Component)
import BotonInteractivo from './BotonInteractivo' // Solo este es 'use client'
async function Pagina() {
  const datos = await fetch(...)
  return <div><DatosEstaticos datos={datos} /><BotonInteractivo /></div>
}
```

---

## Preguntas frecuentes de entrevista Next.js

**¿Cuál es la diferencia entre SSG, SSR e ISR?**
SSG genera HTML en build time (más rápido, ideal para contenido estático). SSR renderiza en cada request (siempre fresco, mayor latencia). ISR combina ambos: genera estático pero revalida en background según un intervalo.

**¿Qué son los React Server Components y por qué importan?**
Son componentes que se renderizan exclusivamente en el servidor. No envían JavaScript al cliente, pueden acceder directamente a bases de datos y APIs internas, y reducen el bundle size del cliente significativamente.

**¿Cuándo usarías un Route Handler vs un Server Action?**
Route Handler para endpoints REST que serán consumidos por clientes externos o cuando necesitas control total del request/response HTTP. Server Action para mutaciones iniciadas desde formularios o interacciones de UI dentro de la propia aplicación Next.js.

**¿Cómo funciona el sistema de cache en Next.js App Router?**
Next.js tiene 4 capas de cache: Request Memoization (misma request en el mismo render), Data Cache (persistente entre requests, controlado por fetch options), Full Route Cache (HTML estático del build), y Router Cache (cache del cliente para navegación).

**¿Qué es el Middleware en Next.js y cuándo lo usarías?**
Es una función que se ejecuta antes del routing, en el Edge Runtime. Ideal para autenticación (redirigir usuarios no autenticados), A/B testing, internacionalización, y modificación de headers/cookies sin aumentar la latencia.