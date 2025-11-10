import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { Video } from "../models/video.model.js";
import {
  uploadOnCloudinary,
  deletFromCloudinary,
} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";
import { isValidObjectId } from "mongoose";
import mongoose from 'mongoose';

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken; //saving the refreshToken in database
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "something went wrong while generating access and refreshTokens"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { username, email, password, fullName } = req.body;

  console.log("email: ", email);

  // if(fullname === "" || email === '' || password === '' || username === ''){
  //     throw new ApiError(400, "Fullname is required");
  // }

  if (
    [fullName, email, password, username].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const existedUser = await User.findOne({
    $or: [{ email }, { username }], // this $or is an operator in mongodb that allows us find the user in database with either email or username.
  }); // findOne returns the first user that matches either of the entries.

  if (existedUser) throw new ApiError(409, "User already exists");

  console.log("Request files access: ", req.files);
  //req.files is coming from the middleware that we have injected in the route.
  const avatarPath = req.files?.avatar[0]?.path;
  // const coverImagePath = req.files?.coverImage[0]?.path;

  let coverImagePath = "";
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImagePath = req.files.coverImage[0].path;
  }

  console.log(req.files);

  console.log("filePath: ", avatarPath, ", ", coverImagePath);

  if (!avatarPath) throw new ApiError(400, "Avatar is required");
  if (!coverImagePath) throw new ApiError(400, "Cover Image is required");

  const avatar = await uploadOnCloudinary(avatarPath);
  const coverImage = await uploadOnCloudinary(coverImagePath);

  if (!avatar) throw new ApiError(500, "Avatar upload failed");
  if (!coverImage) throw new ApiError(500, "Cover Image upload failed");

  console.log("coverImage: ", coverImage);
  console.log("avatar: ", avatar);

  const user = await User.create({
    fullName,
    email,
    username: username.toLowerCase(),
    password,
    avatar: avatar.url,
    coverImage: coverImage.url || "",
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) throw new ApiError(500, "User registration failed");

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  // req.body -> get the values,
  // username or email based access. check if they are empty or not
  // find the user based on email or username;
  // check the password sent by user with one stored in database.
  // if matched send refresh and accessTokens to the user in the form of secured cookies.

  // console.log(req.body);
  const { email, username, password } = req.body;

  // console.log("emailorusername: ", emailorusername);
  console.log("password: ", password);
  console.log("email: ", email);
  console.log("username: ", username);

  if (!username && !email) throw new ApiError(401, "All fields are required");
  // if (!emailorusername) throw new ApiError(401, "All fields are required");

  const user = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (!user)
    throw new ApiError(404, "user with this email or username doesn't exist");

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) throw new ApiError(401, "password didn't match...");

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  console.log("Access Token: ", accessToken);
  console.log("Refresh Token: ", refreshToken);

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  ); // user to be send to the client.
  //need to remove the password and refresh token from the user object as they are not needed in the response. However, we need to send the refresh token in the cookies.

  const options = {
    httpOnly: true,
    secure: true,
  }; //help make the cookies more secure by making it non-modifiable by frontend.

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        201,
        {
          user: loggedInUser,
          accessToken,
          refreshToken, //sending the tokens to handle the sidecase of cookie not being set in some cases.
        },

        "User logged in successfully"
      )
    );
});

const logOutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1,
      },
    },

    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
    expires: new Date(Date.now() - 1000), // setting the expiry date to past to clear the cookie.
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) throw new ApiError(401, "Unauthorized request");

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken._id);

    if (!user) throw new ApiError(401, "Invalid refresh token");

    if (incomingRefreshToken !== user.refreshToken)
      throw new ApiError(401, "Refresh Token is expired or not used");

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { refreshToken, accessToken } = await generateAccessAndRefreshTokens(
      user._id
    );

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken },
          "Access Token refreshed successfully"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "invalid refresh token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user?._id);

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) throw new ApiError(400, "invalid password");

  user.password = newPassword;

  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "password updated successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "current user fetched successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;

  if (!fullName || !email) throw new ApiError(400, "All fields are required");

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName: fullName,
        email: email,
      },
    },
    { new: true } // this will return the updated user object.
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarPath = req.file?.path; // multer gives acceess to req.file
  if (!avatarPath) throw new ApiError(400, "Avatar file is required");

  const avatar = await uploadOnCloudinary(avatarPath);

  if (!avatar.url) throw new ApiError(400, "Error while uploading the avatar");

  // delete the old avatar from cloudinary

  if (req.user?.avatar) await deletFromCloudinary(req.user?.avatar);

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },

    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(201, user, "avatar updated successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverPath = req.file?.path; // multer gives acceess to req.file
  if (!coverPath) throw new ApiError(400, "Avatar file is required");

  const coverImage = await uploadOnCloudinary(coverPath);

  if (!coverImage.url)
    throw new ApiError(400, "Error while uploading the coverImage");

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },

    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(201, user, "coverImage updated successfully"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) throw new ApiError(400, "Username is required");

  // creating aggregation pipeline to get the user channel profile.

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },

    {
      $lookup: {
        from: "videos",
        localField: "_id",
        foreignField: "owner",
        as: "videos",
      },
    },

    {
      $addFields: {
        subscribersCount: { $size: "$subscribers" },
        subscribedToCount: { $size: "$subscribedTo" },
        videosCount: { $size: "$videos" },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },

    {
      $project: {
        fullName: 1,
        username: 1,
        email: 1,
        subscribersCount: 1,
        subscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        videosCount: 1,
      },
    },
  ]);

  console.log("Channel: ", channel);

  if (!channel?.length) throw new ApiError(404, "channel not found");

  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "channel profile fetched successfully")
    );
});

// Note: _id returns a string, but due to mongoose it is converted to an objectId.
// Here, we will need to access the ObjectId of the user to get the watch history.
const getUserWatchHistory = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  const user = await User.findById(userId).lean();
  if (!user) throw new ApiError(404, "user not found");
  const videos = await Video.find({
    _id: {
      $in: user.watchHistory,
    },
  })
    .populate("owner", "username avatar _id")
    .select(
      "videoFile title description thumbnail duration createdAt views owner "
    )
    .lean();

  // can optimize it further for larger watchHistory arrays by implementing pagination, and using Map().

  if (!videos || videos.length === 0) {
    return res
      .status(200)
      .json(
        new ApiResponse(200, user.watchHistory, "No videos in watch history")
      );
  }

  // sorting the videos based on the order in watchHistory
  const watchHistoryVideos = user.watchHistory.map((videoId) =>
    videos.find((video) => video._id.toString() === videoId.toString())
  );

  console.log("Watch History Videos: ", watchHistoryVideos);
  user.watchHistory = watchHistoryVideos;

  console.log("Watch History: ", user?.watchHistory);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user.watchHistory,
        "Watch history fetched successfully"
      )
    );
});

const removeVideoFromWatchHistory = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  if (!userId) throw new ApiError(400, "Please login first to continue");

  const { videoId } = req.params;
  if (!isValidObjectId(videoId)) throw new ApiError(400, "Invalid VideoId");

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    {
      $pull: {
        watchHistory: new mongoose.Types.ObjectId(videoId)
      }
    },
    {
      new: true,
    }
  )

  console.log("Updated WatchHistory length: ", updatedUser.watchHistory.length );

  return res
  .status(200)
  .json(
    new ApiResponse(
      200,
      updatedUser,
      "successfully removed video from watchHistory"
    )
  )
});

export {
  registerUser,
  loginUser,
  logOutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getUserWatchHistory,
  removeVideoFromWatchHistory
};
