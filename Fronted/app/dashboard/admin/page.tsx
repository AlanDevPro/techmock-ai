'use client';

// Este archivo es necesario para que Next.js reconozca la ruta /dashboard/admin
// El contenido real lo maneja layout.tsx basado en el pathname

export default function AdminDashboardPage() {
  // Este componente nunca se renderiza porque layout.tsx
  // detecta cuando pathname === "/dashboard/admin" y muestra OverviewTab
  return (
    <div>
      {/* Este contenido no se verá, pero el archivo debe existir */}
    </div>
  );
}