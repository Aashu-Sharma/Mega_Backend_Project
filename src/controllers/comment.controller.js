import mongoose, { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getVideoComments = asyncHandler(async (req, res) => {
  //TODO: get all comments for a video
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const userId = req.user?._id;

  if(!isValidObjectId(userId))
    throw new ApiError(404, "please login first to view comments");

  if(!isValidObjectId(videoId))
    throw new ApiError(404, "invalid video id");

  const comments = await Comment.aggregate([
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId),
      }
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
            }
          }
        ]
      }
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
        video: 1,
        content: 1,
        owner: 1,
      }
    },

    {
      $skip: (page - 1) * parseInt(limit),
    },

    {
      $limit: parseInt(limit)
    }
  ])

  console.log("All comments: ", comments);

  return res
        .status(200)
        .json(
          new ApiResponse(200, comments, "successfully fetched the comments")
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

  if (!comment)
    throw new ApiError(500, "sorry, something went wrong while adding comment");

  return res
    .status(201)
    .json(new ApiResponse(201, comment, "comment successfully added"));
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
  );

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

  if(!isValidObjectId(userId))
    throw new ApiError(404, "please login first to delete comment");

  if(!isValidObjectId(commentId))
    throw new ApiError(404, "invalid comment id");

  const comment = await Comment.findById(
    new mongoose.Types.ObjectId(commentId)
  );

  if(!comment) throw new ApiError(404, "comment not found");

  if(comment.owner.toString() !== userId.toString())
    throw new ApiError(401, "you aren't authorised to delete the comment");

  await Comment.findByIdAndDelete(new mongoose.Types.ObjectId(commentId));

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "comment successfully deleted"));
});

export { getVideoComments, addComment, updateComment, deleteComment };
