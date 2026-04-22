# TechMock AI - Landing Page

Una landing page moderna desarrollada con Next.js 16, React 19, Firebase Authentication y Tailwind CSS.

## ✨ Características

- 🎨 **Diseño Moderno**: Interfaz futurista con colores verde neón y efectos visuales
- 🔐 **Autenticación Firebase**: Sistema completo de login/registro
- 📱 **Responsive Design**: Adaptable a móviles, tablets y desktop
- 🧩 **Arquitectura Modular**: Componentes y hooks organizados y reutilizables
- ⚡ **Terminal Animada**: Componente 3D con efectos de disparo y animaciones
- 🎯 **Dashboard Interactivo**: Panel de control estilo "Mission Control"

## 📁 Estructura del Proyecto

```
techmock-ai/
├── app/                    # Next.js App Router
│   ├── auth/              # Página de autenticación
│   ├── dashboard/         # Dashboard principal
│   ├── globals.css        # Estilos globales
│   ├── layout.tsx         # Layout principal
│   └── page.tsx           # Página de inicio
├── components/            # Componentes reutilizables
│   ├── AnalysisSection.tsx
│   ├── Footer.tsx
│   ├── Header.tsx
│   ├── HeroSection.tsx
│   ├── InfrastructureSection.tsx
│   ├── RotatingCube.tsx
│   └── index.ts           # Exportaciones centralizadas
├── contexts/              # React Contexts
│   └── AuthContext.tsx    # Contexto de autenticación
├── hooks/                 # Hooks personalizados
│   ├── useMenu.ts         # Manejo del menú móvil
│   ├── useNavigation.ts   # Navegación centralizada
│   └── index.ts           # Exportaciones centralizadas
├── lib/                   # Utilidades y configuraciones
│   └── firebase.ts        # Configuración de Firebase
└── types/                 # Definiciones de tipos TypeScript
    └── index.ts
```

## 🚀 Instalación y Uso

1. **Instalar dependencias**
   ```bash
   npm install
   ```

2. **Ejecutar en desarrollo**
   ```bash
   npm run dev
   ```

3. **Acceder a la aplicación**
   - Landing page: http://localhost:3000
   - Autenticación: http://localhost:3000/auth
   - Dashboard: http://localhost:3000/dashboard

## 🏗️ Arquitectura

### Hooks Personalizados

- **`useNavigation`**: Maneja la navegación entre páginas con validación de autenticación
- **`useMenu`**: Controla el estado del menú móvil con callbacks optimizados

### Componentes Modulares

- **`Header`**: Navegación principal con menú responsive
- **`HeroSection`**: Sección principal con terminal animada
- **`RotatingCube`**: Terminal 3D con efectos de disparo CSS puro
- **`InfrastructureSection`**: Características del producto
- **`AnalysisSection`**: Información sobre análisis arquitectónico
- **`Footer`**: Enlaces organizados por categorías

### Gestión de Estado

- **AuthContext**: Manejo global de autenticación Firebase
- **Estado local**: Usando hooks nativos de React para UI

## 🎨 Diseño

- **Paleta de colores**: Negro (#000000), Gris oscuro (#1a1a1a), Verde neón (#00ff00)
- **Tipografía**: Geist Sans para textos, Courier New para código
- **Animaciones**: CSS puro para máximo rendimiento
- **Responsive**: Mobile-first con Tailwind CSS

## 🔧 Tecnologías

- **Frontend**: Next.js 16 + React 19 + TypeScript
- **Styling**: Tailwind CSS 4 + CSS-in-JS para animaciones
- **Backend**: Firebase Authentication + Firestore
- **Desarrollo**: ESLint + Turbopack

## 📋 Scripts Disponibles

```bash
npm run dev      # Servidor de desarrollo
npm run build    # Build de producción
npm run start    # Servidor de producción
npm run lint     # Linter ESLint
```

## 🔐 Autenticación

### Funcionalidades
- ✅ Registro de usuarios
- ✅ Inicio de sesión
- ✅ Protección de rutas
- ✅ Estado persistente
- ✅ Logout seguro

### Configuración Firebase
Firebase ya está configurado y listo para usar. Las credenciales están incluidas en `lib/firebase.ts`.

## 🎯 Funcionalidades del Dashboard

- **Métricas en tiempo real**: CPU, Memory, Connections
- **Terminal de logs**: Actualizaciones automáticas cada 3s
- **Centro de análisis**: Progreso de análisis arquitectónico
- **Alertas activas**: Sistema de notificaciones
- **Acciones rápidas**: Botones para funciones principales

## 📱 Responsive Design

- **Mobile**: Menú hamburguesa, layout vertical
- **Tablet**: Navegación adaptativa, grid responsive
- **Desktop**: Navegación completa, efectos hover

---

Desarrollado con ❤️ usando Next.js y Firebase
