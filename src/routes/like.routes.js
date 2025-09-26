import { Router } from "express";
import {
  getLikedVideos,
  toggleCommentLike,
  toggleVideoLike,
  toggleTweetLike,
  getVideoLikesCount,
  getCommentLikesCount,
  getCommentLike,
  getLikedComments,
} from "../controllers/like.controller.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(verifyJwt); // Apply verifyJWT middleware to all routes in this file

router
  .route("/toggle/v/:videoId")
  .post(toggleVideoLike);


router.route("/toggle/v/likes/:videoId").post(getVideoLikesCount)
router.route("/c/likesCount").post(getCommentLikesCount); 
router.route("/c/likesCount/:commentId").post(getCommentLike)

              
router.route("/toggle/c/:commentId").post(toggleCommentLike);
router.route("/toggle/t/:tweetId").post(toggleTweetLike);
router.route("/videos").get(getLikedVideos);
router.route("/comments/liked").post(getLikedComments); // Updated route to accept comment IDs in the body

export default router;
