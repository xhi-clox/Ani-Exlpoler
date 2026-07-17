import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  updateComment,
  deleteComment,
  upvoteComment,
  removeCommentUpvote,
} from "../controllers/commentsController";

const router = Router();

router.patch("/:id", requireAuth, updateComment);
router.delete("/:id", requireAuth, deleteComment);
router.post("/:id/upvote", requireAuth, upvoteComment);
router.delete("/:id/upvote", requireAuth, removeCommentUpvote);

export default router;
