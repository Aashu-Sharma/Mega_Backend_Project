import mongoose, { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getVideoComments = asyncHandler(async (req, res) => {
  //TODO: get all comments for a video
  const { videoId } = req.params;
  const {
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    sortType = "desc",
  } = req.query;

  const userId = req.user?._id;

  if (!isValidObjectId(userId))
    throw new ApiError(404, "please login first to view comments");

  if (!isValidObjectId(videoId)) throw new ApiError(404, "invalid video id");

  const comments = await Comment.aggregate([
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId),
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
        video: 1,
        content: 1,
        owner: 1,
        createdAt: 1,
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

  if (comments.length === 0)
    throw new ApiError(404, "No comments found for this user");

  console.log("All comments: ", comments);

  const totalComments = await Comment.countDocuments({
    video: new mongoose.Types.ObjectId(videoId),
  });

  const hasMore = page * limit < totalComments;

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { comments, hasMore },
        "successfully fetched the comments"
      )
    );
});

const getVideoCommentsCount = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const { videoId } = req.params;

  if (!isValidObjectId(userId))
    throw new ApiError(400, "Please login first to continue");

  if (!isValidObjectId(videoId)) throw new ApiError(401, "Invalid Video Id");

  const totalComments = await Comment.countDocuments({
    video: new mongoose.Types.ObjectId(videoId),
  });

  console.log("Total Comments on the video: ", totalComments);

  if (!totalComments)
    throw new ApiError(
      500,
      "Some error occured while displaying comments count"
    );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        totalComments,
        "Successfully fetched total comments on the video"
      )
    );
});

const addComment = asyncHandler(async (req, res) => {
  // TODO: add a comment to a video
  const { videoId } = req.params;
  const userId = req.user?._id;
  const { content } = req.body;

  console.log("req.body: ", req.body);

  console.log("content: ", content);

  if (!isValidObjectId(userId))
    throw new ApiError(404, "please login first to comment");
  if (!isValidObjectId(videoId)) throw new ApiError(404, "invalid video id");
  if (!content) throw new ApiError(404, "nothing to add as comment");

  console.log("UserId: ", userId);
  console.log("VideoId: ", videoId);
  console.log("Comment: ", content.toString());

  const comment = await Comment.create({
    video: new mongoose.Types.ObjectId(videoId),
    content,
    owner: new mongoose.Types.ObjectId(userId),
  });

  const addedComment = await Comment.findById(comment._id).populate(
    "owner",
    "username avatar createdAt"
  );

  if (!comment)
    throw new ApiError(500, "sorry, something went wrong while adding comment");

  return res
    .status(201)
    .json(new ApiResponse(201, addedComment, "comment successfully added"));
});

const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user?._id;
  const { content } = req.body;

  if (!isValidObjectId(userId))
    throw new ApiError(404, "please login first to update comment");

  if (!isValidObjectId(commentId))
    throw new ApiError(404, "invalid comment id");

  const comment = await Comment.findById(
    new mongoose.Types.ObjectId(commentId)
  );

  if (!comment) throw new ApiError(404, "comment not found");

  if (comment.owner.toString() !== userId.toString())
    throw new ApiError(401, "you aren't authorised to update the comment");

  const updatedComment = await Comment.findByIdAndUpdate(
    commentId,
    {
      $set: {
        content,
      },
    },

    { new: true }
  ).populate("owner", "username avatar createdAt");

  console.log("Updated Comment: ", updatedComment);

  if (!updatedComment)
    throw new ApiError(
      500,
      "sorry, something went wrong while updating comment"
    );

  return res
    .status(200)
    .json(new ApiResponse(200, updatedComment, "comment successfully updated"));
});

const deleteComment = asyncHandler(async (req, res) => {
  // TODO: delete a comment
  const { commentId } = req.params;
  const userId = req.user?._id;

  if (!isValidObjectId(userId))
    throw new ApiError(404, "please login first to delete comment");

  if (!isValidObjectId(commentId))
    throw new ApiError(404, "invalid comment id");

  const comment = await Comment.findById(
    new mongoose.Types.ObjectId(commentId)
  );

  if (!comment) throw new ApiError(404, "comment not found");

  if (comment.owner.toString() !== userId.toString())
    throw new ApiError(401, "you aren't authorised to delete the comment");

  await Comment.findByIdAndDelete(new mongoose.Types.ObjectId(commentId));

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "comment successfully deleted"));
});

export {
  getVideoComments,
  getVideoCommentsCount,
  addComment,
  updateComment,
  deleteComment,
};
