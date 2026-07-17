import { Router } from "express";
import { optionalAuth, requireAuth } from "../middleware/auth";
import {
  getProfile,
  updateProfile,
  getUserAnalyses,
  getFollowers,
  getFollowing,
  followUser,
  unfollowUser,
  getTopAnime,
  setTopAnime,
  getTopCharacters,
  setTopCharacters,
  upvoteProfile,
  removeProfileUpvote,
} from "../controllers/usersController";
import {
  listCollections,
  createCollection,
  addCollectionItem,
  removeCollectionItem,
} from "../controllers/collectionsController";

const router = Router();

router.get("/:username", optionalAuth, getProfile);
router.patch("/:username", requireAuth, updateProfile);
router.get("/:username/analyses", getUserAnalyses);
router.get("/:username/followers", getFollowers);
router.get("/:username/following", getFollowing);
router.post("/:username/follow", requireAuth, followUser);
router.delete("/:username/follow", requireAuth, unfollowUser);
router.get("/:username/top-anime", getTopAnime);
router.put("/:username/top-anime", requireAuth, setTopAnime);
router.get("/:username/top-characters", getTopCharacters);
router.put("/:username/top-characters", requireAuth, setTopCharacters);
router.post("/:username/upvote-taste", requireAuth, upvoteProfile);
router.delete("/:username/upvote-taste", requireAuth, removeProfileUpvote);
router.get("/:username/collections", listCollections);
router.post("/:username/collections", requireAuth, createCollection);

export default router;
