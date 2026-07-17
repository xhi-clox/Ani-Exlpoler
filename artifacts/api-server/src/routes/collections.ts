import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  updateCollection,
  deleteCollection,
  addCollectionItem,
  removeCollectionItem,
} from "../controllers/collectionsController";

const router = Router();

router.patch("/:id", requireAuth, updateCollection);
router.delete("/:id", requireAuth, deleteCollection);
router.post("/:id/items", requireAuth, addCollectionItem);
router.delete("/:id/items/:itemId", requireAuth, removeCollectionItem);

export default router;
