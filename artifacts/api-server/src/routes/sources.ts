import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { listSources, submitSource, reportSource } from "../controllers/sourcesController";

const router = Router();

router.get("/anime/:id/sources", listSources);
router.post("/anime/:id/sources", requireAuth, submitSource);
router.post("/sources/:id/report", requireAuth, reportSource);

export default router;
