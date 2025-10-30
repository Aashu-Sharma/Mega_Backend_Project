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
        },
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
          $first: "$video",
        },
      },
    },

    {
      $project: {
        likedVideo: 1,
      },
    },
  ]);

  if (!Likedvideos)
    throw new ApiError(
      500,
      "There was an error while displaying your likedVideos"
    );

  console.log("LikedVideos: ", Likedvideos);

  return res
    .status(200)
    .json(
      new ApiResponse(200, Likedvideos, "successfully fetched the likedVideos")
    );
});

const getLikedComments = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const { commentIds } = req.body; // Array of comment IDs to check

  if (!isValidObjectId(userId)) throw new ApiError(401, "Please login first");

  if (!Array.isArray(commentIds) || commentIds.length === 0)
    throw new ApiError(400, "CommentIds must be provided");

  const LikedComments = await Like.find(
    {
      likedBy: new mongoose.Types.ObjectId(userId),
      // comment: {
      //   $exists: true,
      // }// it gives all liked comments by the user irrespective of the video under which the comments were made.

      comment: {
        $in: commentIds.map((id) => new mongoose.Types.ObjectId(id)),
      },
    },

    {
      comment: 1,
      _id: 0,
    }
  );

  const LikedCommentIds = LikedComments.map((like) => like.comment);

  if (LikedCommentIds === null)
    throw new ApiError(500, "Some error occured while fetching liked comments");

  console.log("LikedComments: ", LikedCommentIds);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        LikedCommentIds,
        "Successfully fetched the liked comments"
      )
    );
});

const getVideoLikesCount = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const userId = req.user?._id;

  if (!videoId) throw new ApiError(401, "invalid videoId");

  if (!userId) throw new ApiError(401, "Please login first");

  const totalLikes = await Like.countDocuments({
    video: new mongoose.Types.ObjectId(videoId),
  });

  console.log("Total likes on video: ", totalLikes);

  if (totalLikes === null)
    throw new ApiError(500, "Some error occured while displaying likes count");

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        totalLikes,
        "Successfully fetched total likes on the video"
      )
    );
});

const getCommentLike = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const { commentId } = req.params;

  if (!isValidObjectId(userId)) throw new ApiError(401, "Please login first");

  if (!isValidObjectId(commentId)) throw new ApiError(400, "Invalid videoId");

  const totalLike = await Like.countDocuments({
    comment: new mongoose.Types.ObjectId(commentId),
  });

  if (totalLike === null)
    throw new ApiError(
      500,
      "Sorry, there was an error fetching likes on the comment"
    );

  console.log(`totalLikesOnCommentId ${commentId}: ${totalLike} `);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        totalLike,
        `Successfully fetched the likes on commentId ${commentId}`
      )
    );
});

const getCommentLikesCount = asyncHandler(async (req, res) => {
  //For bulk
  const userId = req.user?._id;
  const { commentIds } = req.body;

  if (!isValidObjectId(userId)) throw new ApiError(401, "Please login first");

  if (!Array.isArray(commentIds) || commentIds.length === 0)
    throw new ApiError(400, "CommentIds must be provided");

  const invalidId = commentIds.find((id) => !isValidObjectId(id));
  if (invalidId)
    throw new ApiError(400, `Invalid id found in commentIds ${invalidId}`);

  // $in takes an array of commentIds here to match the commentId in the documents to those of in the array.
  // only those documents will pass the stage that have the same comment id as that of those in the array.
  const likes = await Like.aggregate([
    {
      $match: {
        comment: {
          $in: commentIds.map((id) => new mongoose.Types.ObjectId(id)),
        },
      },
    },

    {
      $group: {
        _id: "$comment",
        count: {
          $sum: 1,
        },
      },
    },
  ]);

  console.log("likes: ", likes);

  const likesOnComments = commentIds.reduce((acc, id) => {
    const found = likes.find((item) => String(item._id) === id);
    acc[id] = found ? found.count : 0;
    return acc;
  }, {});

  console.log("LikesonComment:", likesOnComments);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        likesOnComments,
        "Successfully fetched likes count on all comments on a particular video"
      )
    );
});

const getLikedTweets = asyncHandler(async (req, res) => {
  // For getting all liked tweets by a user
  const userId = req.user?._id;
  const { tweetIds } = req.body;

  if (!isValidObjectId(userId))
    throw new ApiError(400, "Please login first to continue");

  if (!Array.isArray(tweetIds) || tweetIds.length === 0)
    throw new ApiError(400, "CommentIds must be provided");

  const LikedTweets = await Like.find(
    {
      likedBy: new mongoose.Types.ObjectId(userId),
      tweet: {
        $in: tweetIds.map((id) => new mongoose.Types.ObjectId(id)),
      },
    },

    {
      tweet: 1,
      _id: 0,
    }
  );

  const LikedTweetIds = LikedTweets.map((like) => like.tweet);

  if (LikedTweetIds === null)
    throw new ApiError(500, "Some error occured while fetching liked tweets");

  console.log("LikedTweets: ", LikedTweetIds);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        LikedTweetIds,
        "Successfully fetched the liked tweets"
      )
    );
});

const getTweetLike = asyncHandler(async (req, res) => {
  // for getting likes on a particular tweet
  const userId = req.user?._id;
  const { tweetId } = req.params;

  if (!isValidObjectId(userId)) throw new ApiError(401, "Please login first");

  if (!isValidObjectId(tweetId)) throw new ApiError(400, "Invalid tweetId");

  const totalLike = await Like.countDocuments(
    {
      tweet : new mongoose.Types.ObjectId(tweetId),
    }
  );

  if(totalLike === null)
    throw new ApiError(500, "Some error occured while fetching likes on the tweet");

  console.log(`totalLikesOnTweetId ${tweetId}: ${totalLike} `);
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        totalLike,
        `Successfully fetched the likes on tweetId ${tweetId}`
      )
    );
});

const getTweetsLikesCount = asyncHandler(async (req, res) => {
  // for getting likes count on multiple tweets
  const userId = req.user?._id;
  const {tweetIds} = req.body;

  if (!isValidObjectId(userId)) throw new ApiError(401, "Please login first");

  if (!Array.isArray(tweetIds) || tweetIds.length === 0)
    throw new ApiError(400, "TweetIds must be provided");

  const invalidId = tweetIds.find((id) => !isValidObjectId(id));
  
  if(invalidId) 
    throw new ApiError(400, `Invalid id found in tweetIds ${invalidId}`);

  const tweetsLikes = await Like.aggregate([
    {
      $match: {
        tweet : {
          $in: tweetIds.map((id) => new mongoose.Types.ObjectId(id))
        }
      }
    },

    {
      $group: {
        _id: "$tweet",
        count: {
          $sum: 1,
        }
      }
    }
  ]);

  console.log("tweetsLikes: ", tweetsLikes);

  const LikesOnTweets = tweetIds.reduce((acc, id) => {
    const found = tweetsLikes.find((item) => String(item._id) === id);
    acc[id] = found ? found.count : 0;
    return acc;
  }, {})
  
  console.log("LikesOnTweets:", LikesOnTweets);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        LikesOnTweets,
        "Successfully fetched likes count on all tweets"
      )
    );
});

export {
  toggleCommentLike,
  toggleTweetLike,
  toggleVideoLike,
  getLikedVideos,
  getLikedComments,
  getVideoLikesCount,
  getCommentLikesCount,
  getCommentLike,
  getLikedTweets,
  getTweetLike,
  getTweetsLikesCount,
};
