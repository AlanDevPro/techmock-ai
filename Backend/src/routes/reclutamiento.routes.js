// routes/reclutamiento.routes.js
import { Router } from "express";
import { contactarDeveloper, getContactos } from "../controllers/admin.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { onlyAdmin } from "../middlewares/role.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { contactoSchema } from "../validators/contacto.validator.js";

const router = Router();

router.use(verifyToken, onlyAdmin);

// POST /api/v1/admin/reclutamiento
router.post("/", validate(contactoSchema), contactarDeveloper);

// GET  /api/v1/admin/reclutamiento
router.get("/", getContactos);

export default router;