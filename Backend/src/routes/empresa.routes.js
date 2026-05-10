// routes/empresa.routes.js
import { Router } from "express";
import { getEmpresa } from "../controllers/empresa.controller.js";

const router = Router();

// GET /api/v1/empresa
router.get("/", getEmpresa);

export default router;