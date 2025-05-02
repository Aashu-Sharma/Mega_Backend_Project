import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import {
  publishVideo,
  getVideoById,
  deleteVideo,
  updateVideo,
  togglePublishStatus,
  getAllVideos,
} from "../controllers/video.controllers.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/").get(verifyJwt, getAllVideos);

router.route("/createVideo").post(
  verifyJwt,
  upload.fields([
    {
      name: "videoFile",
      maxCount: 1,
    },
    {
      name: "thumbnail",
      maxCount: 1,
    },
  ]),

  publishVideo
);

router
  .route("/:videoId")
  .get(verifyJwt, getVideoById)
  .patch(verifyJwt, upload.single("thumbnail"), updateVideo)

router.route("/:videoId").delete(verifyJwt, deleteVideo);

router.route("/toggle/publish/:videoId").patch(verifyJwt, togglePublishStatus);

export default router;
