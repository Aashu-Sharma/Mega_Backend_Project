import {Router} from 'express';
import { loginUser, logOutUser, refreshAccessToken, registerUser } from '../controllers/user.controller.js';
import {upload} from '../middlewares/multer.middleware.js';
import { verifyJwt } from '../middlewares/auth.middleware.js';

const router = Router(); 
 
router.route('/register').post(
    // we hvae injected a middleware here, named upload which is used to upload the images.
    upload.fields([
        {
            name: 'avatar',
            maxCount: 1
        }, 
        {
            name: 'coverImage',
            maxCount: 1
        }
    ])
    ,registerUser
);

router.route("/login").post(loginUser);

router.route("/logOut").post(verifyJwt, logOutUser);

router.route("/refresh-token").post(refreshAccessToken);

export default router;