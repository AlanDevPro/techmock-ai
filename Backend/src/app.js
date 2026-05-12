// src/app.js

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";

// ── Routes ────────────────────────────────────────────
import authRoutes from "./routes/auth.routes.js";
import usuariosRoutes from "./routes/usuarios.routes.js";
import authProviderRoutes from "./routes/authProvider.routes.js";
import adminRoutes from "./routes/admin.routes.js"; // 🔥 NUEVO
import sesionesRoutes from "./routes/sesiones.routes.js";



// ── Middlewares ───────────────────────────────────────
import { generalLimiter } from "./middlewares/rateLimiter.middleware.js";
import { errorHandler } from "./middlewares/errorHandler.middleware.js";

dotenv.config();

const app = express();

// ──────────────────────────────────────────────────────
// Seguridad
// ──────────────────────────────────────────────────────

app.use(helmet());

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
}));

// ──────────────────────────────────────────────────────
// Parsers
// ──────────────────────────────────────────────────────

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// ──────────────────────────────────────────────────────
// Rate limiter global
// ──────────────────────────────────────────────────────

app.use("/api/v1", generalLimiter);

// ──────────────────────────────────────────────────────
// Health checks
// ──────────────────────────────────────────────────────

app.get("/", (req, res) => {
  res.send("API running 🚀");
});

app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ──────────────────────────────────────────────────────
// API Routes
// ──────────────────────────────────────────────────────

// 🔐 Auth
app.use("/api/v1/auth", authRoutes);

// 👤 Usuarios autenticados
app.use("/api/v1/usuarios", usuariosRoutes);

// 🔗 Providers OAuth / Password Linking
app.use("/api/v1/auth/providers", authProviderRoutes);

// 👑 Panel Admin
app.use("/api/v1/admin", adminRoutes); // 🔥 NUEVO

// 👑 Panel entrevistas
app.use("/api/v1/sesiones", sesionesRoutes);

// ──────────────────────────────────────────────────────
// 404 handler
// ──────────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
  });
});

// ──────────────────────────────────────────────────────
// Error handler global
// ──────────────────────────────────────────────────────

app.use(errorHandler);

// ──────────────────────────────────────────────────────
// Server
// ──────────────────────────────────────────────────────

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`
🚀 Server running
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 URL: http://localhost:${PORT}
📦 ENV: ${process.env.NODE_ENV || "development"}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
});

export default app;