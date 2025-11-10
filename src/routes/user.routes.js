import { Router } from "express";
import {
  changeCurrentPassword,
  getCurrentUser,
  getUserChannelProfile,
  getUserWatchHistory,
  loginUser,
  logOutUser,
  refreshAccessToken,
  registerUser,
  removeVideoFromWatchHistory,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
  // we hvae injected a middleware here, named upload which is used to upload the images.
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]), // middleware to handle file uploads
  registerUser
);

router.route("/login").post(loginUser);

router.route("/logOut").post(verifyJwt, logOutUser);

router.route("/refresh-token").post(refreshAccessToken);

router.route("/change-password").post(verifyJwt, changeCurrentPassword);

router.route("/current-user").get(verifyJwt, getCurrentUser);

router.route("/update-user").patch(verifyJwt, updateAccountDetails);

router
  .route("/avatar")
  .patch(verifyJwt, upload.single("avator"), updateUserAvatar);

router
  .route("/coverImage")
  .patch(verifyJwt, upload.single("coverImage"), updateUserCoverImage);

router.route("/c/:username").get(verifyJwt, getUserChannelProfile);

router.route("/watchHistory").get(verifyJwt, getUserWatchHistory);
router
  .route("/watchHistory/:videoId") 
  .patch(verifyJwt, removeVideoFromWatchHistory);

export default router;
