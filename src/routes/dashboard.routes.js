import { Router } from 'express';
import {
    getChannelPlaylists,
    getChannelPosts,
    getChannelStats,
    getChannelVideos,
} from "../controllers/dashboard.controller.js"
import {verifyJwt} from "../middlewares/auth.middleware.js"

const router = Router();

router.use(verifyJwt); // Apply verifyJWT middleware to all routes in this file

router.route("/stats").get(getChannelStats);
router.route("/videos").get(getChannelVideos);
router.route("/playlists").get(getChannelPlaylists);
router.route("/posts").get(getChannelPosts);

export default router