import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { Like } from "../models/like.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getChannelStats = asyncHandler(async (req, res) => {
  // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
  const userId = req.user?._id;

  if (!isValidObjectId(userId))
    throw new ApiError(400, "Please login first to continue");

  const totalVideos = await Video.countDocuments({
    owner: new mongoose.Types.ObjectId(userId),
  });

  if (!totalVideos)
    throw new ApiError(500, "An error occured while displaying totalvideos");

  console.log("Total no. of videos: ", totalVideos);

  const totalSubscribers = await Subscription.countDocuments({
    channel: new mongoose.Types.ObjectId(userId),
  });

  if (!totalSubscribers)
    throw new ApiError(500, "An error occured while displaying totalvideos");

  console.log("Total no. of subscribers: ", totalSubscribers);

  const totalViewsResult = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },

    {
      $group: {
        _id: null,
        totalViews: { $sum: "$views" },
      },
    },
  ]);

  const totalViews = totalViewsResult.length > 0 ? totalViewsResult[0].totalViews : 0;

  if (!totalViewsResult.length === 0)
    throw new ApiError(500, "An error occured while displaying totalViews");

  console.log("TotalViews: ", totalViews);

  const totalLikes = await Like.countDocuments({
    likedBy: new mongoose.Types.ObjectId(userId),
    video: {
      $exists: true,
    },
  });

  if (!totalLikes)
    throw new ApiError(
      500,
      "An error occured while displaying your totalLikes"
    );

  console.log("TotalLikes: ", totalLikes);

  const stats = {
    totalVideos,
    totalViews,
    totalSubscribers,
    totalLikes,
  };

  return res
    .status(200)
    .json(new ApiResponse(200, stats, "Successfully fetched channel's stats "));
});

const getChannelVideos = asyncHandler(async (req, res) => {
  // TODO: Get all the videos uploaded by the channel
  const userId = req.user?._id;
  const { page = 1, limit = 10 } = req.query;

  if (!isValidObjectId(userId))
    throw new ApiError(400, "Please login first to continue");

  const channelVideos = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },

    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $project: {
              fullName: 1,
              username: 1,
              avatar: 1,
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
        isPublished: 1,
        owner: 1,
      },
    },

    {
      $sort: {
        createdAt: -1,
      },
    },

    {
      $skip: (page - 1) * limit,
    },

    {
      $limit: parseInt(limit),
    },
  ]);

  if (!channelVideos || channelVideos.length === 0)
    throw new ApiError(404, "No video found for this user");

  console.log("Channel Videos: ", channelVideos);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        channelVideos,
        "successfully fetched the channel videos"
      )
    );
});

export { getChannelStats, getChannelVideos };
