import {Router} from 'express';
import { registerUser } from '../controllers/user.controller.js';
import {upload} from '../middlewares/multer.middleware.js';

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
)

export default router;