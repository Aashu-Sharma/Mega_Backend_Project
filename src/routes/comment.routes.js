import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import {
  addComment,
  deleteComment,
  getVideoCommentsCount,
  getVideoComments,
  updateComment,
} from "../controllers/comment.controller.js";

const router = Router();

router
  .route("/:videoId")
  .post(verifyJwt, addComment)
  .get(verifyJwt, getVideoComments)

router
.route("/count/:videoId")
.get(verifyJwt, getVideoCommentsCount);

router
  .route("/:commentId")
  .patch(verifyJwt, updateComment)
  .delete(verifyJwt, deleteComment);

export default router;
