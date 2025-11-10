import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import {
  uploadOnCloudinary,
  deletFromCloudinary,
} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";
import mongoose, { isValidObjectId } from "mongoose";
import redisClient from "../redis-config/redis.config.js";
import fs from "fs";

const getAllVideos = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    query = "",
    sortBy = "createdAt",
    sortType = "desc",
    userId,
  } = req.query;

  if (!req.user) throw new ApiError(401, "please login first");

  const match = {
    ...(query ? { title: { $regex: query, $options: "i" } } : {}),
    ...(userId ? { owner: new mongoose.Types.ObjectId(userId) } : {}),
  };

  //when neither userId nor title is provided, it will return all the documents in the collection.

  const videos = await Video.aggregate([
    {
      $match: match, //filters out the videos on the basis of match queries.
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
        [sortBy]: sortType === "desc" ? -1 : 1,
      },
    },

    {
      $skip: (page - 1) * parseInt(limit),
    },

    {
      $limit: parseInt(limit),
    },
  ]);

  if (!videos) throw new ApiError(404, "videos not found");

  return res
    .status(200)
    .json(new ApiResponse(200, videos, "successfully fetched the video"));
});

// TODO: get video, upload to cloudinary, create video
const publishVideo = asyncHandler(async (req, res) => {
  const { title, description, isPublished } = req.body;

  if (!title || !description)
    throw new ApiError(400, "Title and description are required");

  console.log("Accessing files coming from the request:", req.files);

  const videoPath = req.files?.videoFile[0]?.path;

  const maxFileSize = process.env.MAX_FILE_SIZE || 100 * 1024 * 1024;

  const { size } = fs.statSync(videoPath);

  if (size > maxFileSize)
    throw new ApiError(
      400,
      `File size should be less than ${maxFileSize / (1024 * 1024)} MB`
    );

  const thumbnailPath = req.files?.thumbnail[0]?.path;

  console.log("Video path: ", videoPath);
  console.log("thumbnail path: ", thumbnailPath);

  if (!videoPath && !thumbnailPath)
    throw new ApiError(400, "Video and thumbnail are required");

  const video = await uploadOnCloudinary(videoPath);
  const thumbnail = await uploadOnCloudinary(thumbnailPath);

  console.log("Video: ", video);
  console.log("Thumbnail: ", thumbnail);

  if (!video && !thumbnail) throw new ApiError(500, "Avatar upload failed");

  const videoData = await Video.create({
    title,
    description,
    videoFile: video?.url,
    thumbnail: thumbnail?.url,
    duration: video?.duration,
    isPublished,
    owner: req.user?._id,
  });

  console.log("VideoData: ", videoData);

  if (!videoData) throw new ApiError(500, "Video couldn't be uploaded");

  return res
    .status(201)
    .json(new ApiResponse(200, videoData, "video uploaded successfully"));
});

const addVideoToWatchHistory = async (videoId, userId) => {
  //works for both adding and updating the watch history
  // this function will be called whenever a user watches a video, and can be called inside getVideoById controller itself.
  try {
    const user = await User.findById(userId);

    if (!user) throw new ApiError(404, "User not found");

    const alreadyExists = user.watchHistory.find(
      (item) => item.toString() === videoId.toString()
    );

    if (!alreadyExists) {
      user.watchHistory.unshift(videoId);
      if (user.watchHistory.length > 100) {
        user.watchHistory.pop();
      }
      await user.save({ validateBeforeSave: false });
    } else {
      const indexOfVideo = user.watchHistory.findIndex(
        (item) => item.toString() === videoId.toString()
      );
      if (indexOfVideo !== -1) {
        user.watchHistory.splice(indexOfVideo, 1);
        user.watchHistory.unshift(videoId);
        await user.save({ validateBeforeSave: false });
      }
    }

    console.log(
      alreadyExists ? "watch history updated" : "video added to watch history"
    );

    return {
      success: true,
      message: alreadyExists
        ? "Watch history updated"
        : "Video added to watch history",
    };
  } catch (error) {
    throw new ApiError(
      500,
      "something went wrong while adding video to watch history"
    );
  }
};

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  console.log("VideoId: ", videoId);

  if (!isValidObjectId(videoId)) throw new ApiError(400, "Invalid VideoId");

  const userId = req.user._id;

  if (!isValidObjectId(userId)) throw new ApiError(400, "Invalid userId");

  const viewKey = `viewed:${userId}:${videoId}`;

  // console.log("ViewKey: ", viewKey)

  const alreadyViewed = await redisClient.get(viewKey);

  // console.log("AlreadyViewed: ", alreadyViewed);

  if (!alreadyViewed) {
    await Video.updateOne({ _id: videoId }, { $inc: { views: 1 } });
    await redisClient.set(viewKey, "true", { EX: 86400 });
  }

  try {
    const addToHistory = await addVideoToWatchHistory(videoId, userId);
    if (!addToHistory?.success) {
      console.log("Watch history not updated:", addToHistory.message);
    } else {
      console.log(addToHistory.message);
    }
  } catch (err) {
    console.error("Error adding video to watch history:", err.message);
  }

  // a bug here in views section is that whenever it finds the user has already viewed the video it won't update the viewcount even after  24 hrs have passed as it happens only when there video isn't already viewed.

  const video = await Video.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(videoId),
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
            $lookup: {
              from: "subscriptions",
              localField: "_id",
              foreignField: "channel",
              as: "subscribers",
            },
          },

          {
            $addFields: {
              subscribersCount: { $size: "$subscribers" },
            },
          },

          {
            $project: {
              fullName: 1,
              username: 1,
              avatar: 1,
              subscribersCount: 1,
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
        description: 1,
        views: 1,
        isPublished: 1,
        owner: 1,
        createdAt: 1,
      },
    },
  ]);

  // console.log("Video: ", video)

  const videoData = video[0];

  if (!videoData) throw new ApiError(401, "Unable to get the video for you!!!");

  console.log("VideoData: ", videoData);

  return res
    .status(200)
    .json(new ApiResponse(201, videoData, "Video fetched successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const userId = req.user?._id;
  console.log("Video Id: ", videoId);

  console.log("UserId: ", userId);

  const video = await Video.findById(videoId);

  if (!video) throw new ApiError(404, "couldn't access the video, Sorry!!!");

  console.log("VideoData: ", video);

  console.log("Owner of the video: ", video.owner);

  if (video.owner.toString() !== userId.toString())
    throw new ApiError(401, "you aren't entitled to delete the video");

  const query = { _id: videoId };

  const deleted = await Video.deleteOne(query);

  if (!deleted.acknowledged)
    throw new ApiError(501, "sorry, video couldn't be deleted!!");

  await deletFromCloudinary(video.videoFile);
  await deletFromCloudinary(video.thumbnail);

  return res
    .status(200)
    .json(new ApiResponse(201, {}, "video deleted successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
  //TODO: update video details like title, description, thumbnail

  const { videoId } = req.params;
  const userId = req.user?._id;

  const { title, description } = req.body;
  const thumbnailpath = req.file?.path;

  const video = await Video.findById(videoId);

  if (video.owner.toString() !== userId.toString())
    throw new ApiError(404, "you are not authorised to perform this action");

  if (!title && !description && !thumbnailpath)
    throw new ApiError(401, "neither title nor description is provide");

  let updatedThumbnail;
  if (thumbnailpath) {
    updatedThumbnail = await uploadOnCloudinary(thumbnailpath);
    await deletFromCloudinary(video?.thumbnail);
  }

  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        title,
        description,
        thumbnail: updatedThumbnail?.url,
      },
    },

    { new: true }
  );

  return res
    .status(201)
    .json(
      new ApiResponse(200, updatedVideo, "Video details updated successfully")
    );
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const userId = req.user?._id;

  const video = await Video.findById(videoId);

  if (video.owner.toString() !== userId.toString())
    throw new ApiError(404, "you aren't authorised to perform this action");

  const updatedvideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        isPublished: !video.isPublished,
      },
    },

    { new: true }
  );

  console.log("updatedVideo: ", updatedvideo);

  return res
    .status(200)
    .json(
      new ApiResponse(
        201,
        updatedvideo,
        "video publish status updated successfully"
      )
    );
});

export {
  publishVideo,
  getVideoById,
  deleteVideo,
  updateVideo,
  togglePublishStatus,
  getAllVideos,
};
