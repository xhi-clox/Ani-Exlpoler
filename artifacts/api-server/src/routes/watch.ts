import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getHistory, markWatched, unwatch, getContinueWatching, updateProgress } from "../controllers/watchController";

const router = Router();

router.get("/watch", requireAuth, getHistory);
router.get("/watch/continue", requireAuth, getContinueWatching);
router.put("/watch/:animeId/:episode", requireAuth, markWatched);
router.delete("/watch/:animeId/:episode", requireAuth, unwatch);
router.patch("/watch/:animeId/progress", requireAuth, updateProgress);

export default router;
