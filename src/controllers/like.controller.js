import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const userId = req.user?._id;

  if (!isValidObjectId(userId))
    throw new ApiError(400, "Please login first to continue");

  if (!isValidObjectId(videoId)) throw new ApiError(400, "Invalid VideoId");

  const existingLike = await Like.findOneAndDelete({
    video: new mongoose.Types.ObjectId(videoId),
    likedBy: new mongoose.Types.ObjectId(userId),
  });

  if (!existingLike) {
    const likedvideo = await Like.create({
      video: new mongoose.Types.ObjectId(videoId),
      likedBy: new mongoose.Types.ObjectId(userId),
    });

    if (!likedvideo)
      throw new ApiError(
        500,
        "There was an error while adding your like to the video"
      );

    console.log("LikedVideo: ", likedvideo);

    return res
      .status(201)
      .json(
        new ApiResponse(201, likedvideo, "Successfully added like to the video")
      );
  }

  console.log("existing Like: ", existingLike);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Successfully unliked the video"));

  //TODO: toggle like on video
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user?._id;

  if (!isValidObjectId(userId))
    throw new ApiError(400, "Please login first to continue");

  if (!isValidObjectId(commentId)) throw new ApiError(400, "Invalid CommentId");

  const existingLikedComment = await Like.findOneAndDelete({
    comment: new mongoose.Types.ObjectId(commentId),
    likedBy: new mongoose.Types.ObjectId(userId),
  });

  if (!existingLikedComment) {
    const likedComment = await Like.create({
      comment: new mongoose.Types.ObjectId(commentId),
      likedBy: new mongoose.Types.ObjectId(userId),
    });

    if (!likedComment)
      throw new ApiError(
        500,
        "There was an error while adding your like to the comment"
      );

    console.log("LikedComment: ", likedComment);

    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
          likedComment,
          "successfully added like to the comment"
        )
      );
  }

  console.log("existingLikedComment: ", existingLikedComment);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "successfully unliked the video"));
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const userId = req.user?._id;

  if (!isValidObjectId(userId))
    throw new ApiError(400, "Please login first to continue");

  if (!isValidObjectId(tweetId)) throw new ApiError(400, "Invalid TweetId");

  const existingLikedTweet = await Like.findOneAndDelete({
    tweet: new mongoose.Types.ObjectId(tweetId),
    likedBy: new mongoose.Types.ObjectId(userId),
  });

  if (!existingLikedTweet) {
    const likedTweet = await Like.create({
      tweet: new mongoose.Types.ObjectId(tweetId),
      likedBy: new mongoose.Types.ObjectId(userId),
    });

    if (!likedTweet)
      throw new ApiError(
        500,
        "There was an error while adding your like to the comment"
      );

    console.log("LikedTweet: ", likedTweet);

    return res
      .status(201)
      .json(
        new ApiResponse(201, likedTweet, "successfully added like to the tweet")
      );
  }

  console.log("existingLikedTweet: ", existingLikedTweet);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "successfully unliked the tweet"));
});

const getLikedVideos = asyncHandler(async (req, res) => {
  const userId = req.user?._id; 

  if (!isValidObjectId(userId))
    throw new ApiError(400, "Please login first to continue");

  const Likedvideos = await Like.aggregate([
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(userId),
        video: {
            $exists: true,
        }
      },
    },

    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "video",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    username: 1,
                    avatar: 1,
                    fullName: 1,
                  },
                },
              ],
            },
          },

          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },

          {
            $project: {
              videoFile: 1,
              thumbnail: 1,
              title: 1,
              duration: 1,
              views: 1,
              owner: 1,
            },
          },
        ],
      },
    },

    {
        $addFields: {
            likedVideo: {
              $first: "$video"
            },
        }
    },

    {
        $project: {
            likedVideo: 1,
        }
    }
  ]);

  if(!Likedvideos)
    throw new ApiError(500, "There was an error while displaying your likedVideos");

  console.log("LikedVideos: ", Likedvideos);

  return res
        .status(200)
        .json(
            new ApiResponse(200, Likedvideos, "successfully fetched the likedVideos")
        )
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
