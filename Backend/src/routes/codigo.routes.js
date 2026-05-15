// routes/codigo.routes.js
import { Router } from "express";
import { getVersionesCodigo, guardarCodigo } from "../controllers/enviosCodigo.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { codigoSchema } from "../validators/codigo.validator.js";

const router = Router({ mergeParams: true });

router.use(verifyToken);

// GET  /api/v1/sesiones/:id/codigo
router.get("/", getVersionesCodigo);

// POST /api/v1/sesiones/:id/codigo
router.post("/", validate(codigoSchema), guardarCodigo);

export default router;