import mongoose, { isValidObjectId, mongo } from "mongoose";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Playlist } from "../models/playlist.model.js";

const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  const userId = req.user?._id;

  if (!isValidObjectId(userId))
    throw new ApiError(400, "please login first to create a playlist");

  if (name === "" || !name)
    throw new ApiError(400, "please provide a name for the playlist");

  if (description === "" || !description)
    throw new ApiError(400, "please provide a description for the playlist");

  console.log("Name:", name);
  console.log("Description:", description);

  const playlist = await Playlist.create({
    name: name,
    description: description,
    owner: new mongoose.Types.ObjectId(userId),
  });

  if (!playlist)
    throw new ApiError(
      500,
      "There was a problem creating your playlist, please try again later"
    );

  console.log("Playlist: ", playlist);

  return res
    .status(201)
    .json(new ApiResponse(201, playlist, "Playlist created successfully"));
});

const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const loggedInUser = req.user?._id;

  if (!isValidObjectId(loggedInUser))
    throw new ApiError(400, "Please login first");

  if (!isValidObjectId(userId)) throw new ApiError(400, "Invalid userId");

  const { page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  const playlists = await Playlist.aggregate([
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

    // {
    //   $unwind: "$videos",
    // },

    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videos",
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

    // {
    //   $group:{
    //     "_id": "$_id",
    //     "videos": {"$push": "$videos"},
    //   }
    // },

    {
      $addFields: {
        owner: {
          $first: "$owner",
        },
      },
    },

    {
      $project: {
        name: 1,
        description: 1,
        owner: 1,
        videos: 1,
      },
    },

    {
      $sort: {
        createdAt: -1,
      },
    },

    {
      $skip: skip,
    },

    {
      $limit: parseInt(limit),
    },
  ]);
  //TODO: get user playlists

  if (!playlists || playlists.length === 0)
    throw new ApiError(404, "No playlists found for this user");

  return res
    .status(200)
    .json(
      new ApiResponse(200, playlists, "Successfully fetched all the playlists")
    );
});

const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  const userId = req.user?._id;

  if (!isValidObjectId(userId))
    throw new ApiError(400, "Please login first to continue");

  if (!isValidObjectId(playlistId))
    throw new ApiError(400, "Invalid PlaylistId");

  const playlist = await Playlist.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(playlistId),
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
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videos",
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
                $first: "$owner"
              }
            }
          }
        ],
      },
    },

    {
      $addFields: {
        owner: {
          $first: "$owner",
        }
      }
    },

    {
      $project: {
        name: 1,
        description: 1,
        owner: 1,
        videos: 1,
      }
    }
  ]);

  if(!playlist)
    throw new ApiError(500, "Couldn't fetch the playlist. Please try again later");

  return res
        .status(200)
        .json(
          new ApiResponse(200, playlist, "successfully fetched the playlist")
        )

  //TODO: get playlist by id
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  const userId = req.user?._id;

  if (!userId) throw new ApiError(400, "Please login first to continue");

  if (!isValidObjectId(playlistId))
    throw new ApiError(400, "Invalid Playlist id");

  console.log("PlaylistId: ", playlistId);

  if (!isValidObjectId(videoId)) throw new ApiError(400, "Invalid Video Id");

  console.log("VideoId: ", videoId);

  const playlist = await Playlist.findById(
    new mongoose.Types.ObjectId(playlistId)
  );

  if (!playlist) throw new ApiError(404, "playlist not found");

  if (playlist.owner.toString() !== userId.toString())
    throw new ApiError(400, "You are not authorised to perform this action");

  // const updatedVideos = [...playlist.videos];

  // console.log("Videos in the playlist before: ", updatedVideos);

  // const exists = updatedVideos.some((video) => video.toString() === videoId.toString());

  // if(exists) throw new ApiError(404, "Video already exists in the playlsit");

  // updatedVideos.push(new mongoose.Types.ObjectId(videoId));

  // console.log("UpdatedVideos: ", typeof updatedVideos);
  // console.log("Videos in the playlist after adding new video: ", updatedVideos);

  // the code above also works fine, you just need to use $set while updating the playlist;

  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    new mongoose.Types.ObjectId(playlistId),

    {
      $addToSet: {
        videos: new mongoose.Types.ObjectId(videoId),
      },
    },

    // $addtoset: adds the value only if the value doesn't already exists in the array

    {
      new: true,
    }
  );

  console.log("UpdatedPlaylist: ", updatedPlaylist);

  if (!updatedPlaylist)
    throw new ApiError(
      500,
      "there was an error while adding video to the playlist"
    );

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        updatedPlaylist,
        "Successfully added video to the playlist"
      )
    );
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  const userId = req.user?._id;

  if (!isValidObjectId(userId))
    throw new ApiError(400, "Please login first to continue");

  if (!isValidObjectId(playlistId))
    throw new ApiError(400, "Invalid PlaylistId");

  if (!isValidObjectId(videoId)) throw new ApiError(400, "Invalid Video Id");

  const playlist = await Playlist.findById(
    new mongoose.Types.ObjectId(playlistId)
  );

  if (!playlist) throw new ApiError(404, "No playlist found with this id");

  if (playlist.owner.toString() !== userId.toString())
    throw new ApiError(400, "You are not authorised to perform this action");

  // const videoIndex = playlist.videos.findIndex(
  //   (video) => video.toString() === videoId.toString()
  // );

  // console.log("VideoIndex: ", videoIndex);

  // if(videoIndex === -1) throw new ApiError("Video not found in the playlist");

  // const updatedVideos = [...playlist.videos];

  // console.log("UpdatedVideos: ", updatedVideos);

  // updatedVideos.splice(videoIndex, 1);

  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    new mongoose.Types.ObjectId(playlistId),

    {
      $pull: {
        videos: new mongoose.Types.ObjectId(videoId),
      },
    },

    {
      new: true,
    }
  );

  // console.log("Vides array after deleting the video from the playlist: ", updatedVideos);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedPlaylist,
        "Successfully removed video from the playlist"
      )
    );
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const userId = req.user?._id;

  if (!isValidObjectId(playlistId))
    throw new ApiError(400, "Invalid PlaylistId");

  if (!isValidObjectId(userId))
    throw new ApiError(400, "Please login first to continue");

  const playlist = await Playlist.findById(
    new mongoose.Types.ObjectId(playlistId)
  );

  if (playlist.owner.toString() !== userId.toString())
    throw new ApiError(401, "You are not authorised to perform this action");

  await Playlist.findByIdAndDelete(new mongoose.Types.ObjectId(playlistId));

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "successfully deleted the playlist"));
  // TODO: delete playlist
});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;

  const userId = req.user?._id;

  if (!isValidObjectId(playlistId))
    throw new ApiError(400, "Invalid PlaylistId");

  if (!isValidObjectId(userId)) throw new ApiError(400, "Please login first");

  if ((!name && !description) || (name === "" && description === ""))
    throw new ApiError(404, "please add something to update");

  console.log("description: ", typeof description);

  const playlist = await Playlist.findById(
    new mongoose.Types.ObjectId(playlistId)
  );

  if (playlist.owner.toString() !== userId.toString())
    throw new ApiError(404, "You are not authorised to perform this action");

  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    new mongoose.Types.ObjectId(playlistId),
    {
      $set: {
        name: name || playlist.name,
        description: description || playlist.description,
      },
    }
  );

  if (!updatedPlaylist)
    throw new ApiError(
      500,
      "there was an error while updating your playlist. Please try again later"
    );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedPlaylist,
        `successfully updated the ${name ? "name" : "description"}`
      )
    );

  //TODO: update playlist
});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};
