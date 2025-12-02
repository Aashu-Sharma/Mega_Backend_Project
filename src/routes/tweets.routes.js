import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import {
  createTweet,
  deleteTweet,
  updateTweet,
  getUserTweets,
} from "../controllers/tweets.controller.js";

const router = Router();

router.use(verifyJwt);

router.route("/user/:userId").get(getUserTweets);
router.route("/create").post(upload.array("images", 3), createTweet);
router
  .route("/:tweetId")
  .patch(upload.array("images", 3), updateTweet)
  .delete(deleteTweet);

export default router;
