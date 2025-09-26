import { Router } from 'express';
import {
    checkIfSubscribed,
    getSubscribedChannels,
    getUserChannelSubscribers,
    toggleSubscription,
} from "../controllers/subscription.controller.js"
import {verifyJwt} from "../middlewares/auth.middleware.js"

const router = Router();
router.use(verifyJwt); // Apply verifyJWT middleware to all routes in this file

router
    .route("/c/:channelId")
    .get(getUserChannelSubscribers)
    .post(toggleSubscription)

router.route("/check/:channelId")
        .get(checkIfSubscribed)

router.route("/u/:subscriberId").get(getSubscribedChannels);

export default router