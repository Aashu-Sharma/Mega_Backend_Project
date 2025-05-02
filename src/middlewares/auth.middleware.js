import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from 'jsonwebtoken';
import {User} from '../models/user.model.js';

export const verifyJwt = asyncHandler(async (req, res, next) => {
    try{
    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
    if (!token) throw new ApiError(401, "Unauthorized request");

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    console.log("DecodedAccessToken", decodedToken);

    const user = await User.findById(decodedToken?._id).select("-passrord -refreshToken"); //again removing password and refresh token from the user object as they are coming from teh database. Documents in database holds both password and refresh token.

    if(!user) throw new ApiError(401, "Invalid Access Token");

    req.user = user;
    next();

    }catch(error) {
        throw new ApiError(401, error?.message || "Invalid Access Token")
    }
})