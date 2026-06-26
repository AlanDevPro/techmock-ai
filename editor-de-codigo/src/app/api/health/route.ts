// src/app/api/health/route.ts
// Endpoint para el HEALTHCHECK del Dockerfile y el AWS ALB.
// El ALB Target Group debe tener configurado: path=/api/health, puerto=3001

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "techmock-editor",
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}