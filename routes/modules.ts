import { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import { requireRole } from "../middleware/roles";
import * as ctrl from "../controllers/moduleController";

const router = Router();

router.get("/", authenticateToken, ctrl.listModules);
router.get("/:id", authenticateToken, ctrl.getModule);
router.post("/", authenticateToken, requireRole("superadmin"), ctrl.createModule);
router.delete("/:id", authenticateToken, requireRole("superadmin"), ctrl.deleteModule);

export default router;
