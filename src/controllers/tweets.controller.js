import mongoose, { isValidObjectId, mongo } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Tweet } from "../models/tweets.model.js";
import {
  deletFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";

const createTweet = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  if (!userId) throw new ApiError(404, "Please Login first to create a tweet");

  const { content } = req.body;

  if (!content)
    throw new ApiError(400, "Nothing to add as tweet, please add some content");

  //   const images = req.files.map((file) => file.path)

  let imagePaths = [];

  if (req.files && req.files.length > 0) {
    req.files.forEach((file) => {
      imagePaths.push(file.path);
    });
  }
  console.log("ImagePaths: ", imagePaths);

  let imageUrls = [];

  if (imagePaths && imagePaths.length > 0) {
    imageUrls = await Promise.all(
      imagePaths.map(async (imagePath) => {
        const image = await uploadOnCloudinary(imagePath);
        console.log("Image: ", image.url);
        return image?.url;
      })
    );
  }

  console.log("ImageUrls: ", imageUrls);

  const tweet = await Tweet.create({
    content,
    images: imageUrls,
    owner: userId,
  });

  if (!tweet)
    throw new ApiError(
      500,
      "There was a problem adding your tweet, please try again later"
    );

  console.log("Tweet: ", tweet);

  return res
    .status(201)
    .json(new ApiResponse(201, tweet, "Tweet created successfully"));
});

const updateTweet = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  if (!isValidObjectId(userId)) throw new ApiError(400, "Please login first");

  const { tweetId } = req.params;
  if (!isValidObjectId(tweetId)) throw new ApiError(400, "Invalid tweet id");

  const tweet = await Tweet.findById(new mongoose.Types.ObjectId(tweetId));
  if (!tweet) throw new ApiError(404, "Tweet not found");

  if (tweet.owner.toString() !== userId.toString())
    throw new ApiError(403, "You are not authorized to update this tweet");

  const { content } = req.body;

  const imagePath = req.files.map((file) => file.path);

  console.log("ImagePath: ", imagePath.toString());

  if (!content && !imagePath)
    throw new ApiError(
      400,
      "Nothing to update, please provide some content or images"
    );

  const { imageToBeUpdated } = req.query;

  let imageIndex;
  let updatedImages = [...tweet.images];

  console.log("ImageToBeUpdated type: ", typeof imageToBeUpdated);
  console.log("ImageToBeUpdated: ", imageToBeUpdated);

  if (imagePath && imageToBeUpdated) {
    console.log("Images Array: ", tweet.images);
    imageIndex = tweet.images.findIndex(
      (image) => image.toString() === imageToBeUpdated.toString()
    );
    console.log("ImageIndex: ", imageIndex);
    if (imageIndex === -1) throw new ApiError(404, "Image not found in tweet");

    let newImage = await uploadOnCloudinary(imagePath[0]);
    await deletFromCloudinary(imageToBeUpdated);

    updatedImages[imageIndex] = newImage?.url;
    console.log("UpdatedImages: ", updatedImages);
  }

  if (imagePath && !imageToBeUpdated) {
    console.log("Images array:", tweet.images);

    if (tweet.images.length === 3)
      throw new ApiError(400, "You can only add upto 3 images to a tweet");

    const newImage = await uploadOnCloudinary(imagePath[0]);
    updatedImages.push(newImage?.url);
    console.log("UpdatedImages: ", updatedImages);
  }

  const updatedTweet = await Tweet.findByIdAndUpdate(
    new mongoose.Types.ObjectId(tweetId),

    {
      $set: {
        content: content || tweet.content,
        images: updatedImages || tweet.images,
      },
    },

    { new: true }
  );

  if (!updatedTweet)
    throw new ApiError(
      500,
      "There was a problem updating your tweet, please try again later"
    );

  console.log("UpdatedTweet: ", updatedTweet);

  return res
    .status(200)
    .json(new ApiResponse(200, updatedTweet, "Tweet updated successfully"));
});

const deleteTweet = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  if (!isValidObjectId(userId)) throw new ApiError(400, "Please login first");

  const { tweetId } = req.params;
  if (!isValidObjectId(tweetId)) throw new ApiError(400, "no TweetId found");

  const tweet = await Tweet.findById(new mongoose.Types.ObjectId(tweetId));

  if (tweet.owner.toString() !== userId.toString())
    throw new ApiError(404, "You are not authorised to perform this action. ");

  const { imageToBeDeleted } = req.query;

  let imageIndex;
  let updatedImages = [...tweet.images];

  if (imageToBeDeleted) {
    console.log("Images Array: ", tweet.images);
    imageIndex = tweet.images.findIndex(
      (image) => image.toString() === imageToBeDeleted.toString()
    );
    console.log("ImageIndex: ", imageIndex);
    if (imageIndex === -1) throw new ApiError(404, "Image not found in tweet");

    await deletFromCloudinary(imageToBeDeleted);
    updatedImages.splice(imageIndex, 1);
    console.log("UpdatedImages: ", updatedImages);

    const updatedTweet = await Tweet.findByIdAndUpdate(
      new mongoose.Types.ObjectId(tweetId),
      {
        $set: {
          images: updatedImages || tweet.images,
        },
      },

      { new: true }
    );

    console.log("UpdatedTweet: ", updatedTweet);

    if (!updatedTweet)
      throw new ApiError(
        500,
        "There was a problem updating your tweet, please try again later"
      );

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          updatedTweet,
          "Image deleted from tweet successfully"
        )
      )
  }

  await Tweet.findByIdAndDelete(new mongoose.Types.ObjectId(tweetId));

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Tweet deleted successfully"));
});

const getUserTweets = asyncHandler(async (req, res) => {
  const loggedInUserId = req.user?._id;

  if (!isValidObjectId(loggedInUserId))
    throw new ApiError(400, "Please login first");

  const {userId} = req.params;
  const { page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  if (!isValidObjectId(userId)) throw new ApiError(400, "Invalid user id");

  const tweets = await Tweet.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
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
        content: 1,
        images: 1,
        owner: 1,
        createdAt: 1,
      }
    },

    {
      $sort: {
        createdAt: -1,
      }
    },

    {
      $skip: skip,
    },

    {
      $limit: parseInt(limit),
    },
  ])

  if(!tweets || tweets.length === 0)
    throw new ApiError(404, "No tweets found for this user");

  return res
    .status(200)
    .json(
      new ApiResponse(200, tweets, "Successfully fetched all the tweets")
    )
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
