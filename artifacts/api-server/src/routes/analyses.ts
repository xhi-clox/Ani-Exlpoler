import { Router } from "express";
import { requireAuth, optionalAuth } from "../middleware/auth";
import {
  listAnalyses,
  getAnalysis,
  createAnalysis,
  updateAnalysis,
  deleteAnalysis,
  upvoteAnalysis,
  removeUpvote,
} from "../controllers/analysesController";
import {
  createComment,
  getComments,
} from "../controllers/commentsController";

const router = Router();

router.get("/", optionalAuth, listAnalyses);
router.get("/:id", optionalAuth, getAnalysis);
router.post("/", requireAuth, createAnalysis);
router.patch("/:id", requireAuth, updateAnalysis);
router.delete("/:id", requireAuth, deleteAnalysis);
router.post("/:id/upvote", requireAuth, upvoteAnalysis);
router.delete("/:id/upvote", requireAuth, removeUpvote);

router.get("/:id/comments", optionalAuth, getComments);
router.post("/:id/comments", requireAuth, createComment);

export default router;
