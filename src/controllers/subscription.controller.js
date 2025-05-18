import mongoose, { isValidObjectId } from "mongoose";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const userId = req.user?._id;

  if (!isValidObjectId(userId))
    throw new ApiError(400, "Please login first to continue");

  if (!isValidObjectId(channelId)) throw new ApiError(400, "Invalid ChannelId");

  const existingSubscription = await Subscription.findOneAndDelete({
    channel: new mongoose.Types.ObjectId(channelId),
    subscriber: new mongoose.Types.ObjectId(userId),
  }); // findOneAndDelete returns the document before deletion.

  if (!existingSubscription) {
    const subscription = await Subscription.create({
      channel: new mongoose.Types.ObjectId(channelId),
      subscriber: new mongoose.Types.ObjectId(userId),
    });

    if (!subscription)
      throw new ApiError(
        500,
        "There was an error while subscribing the channel"
      );

    console.log("New Subscription added: ", subscription);

    return res
      .status(201)
      .json(
        new ApiResponse(201, subscription, "subscription successfully added")
      );
  }

  console.log("ExistingSubscription: ", existingSubscription);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "successfully removed the subscription"));
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const userId = req.user?._id;

  if (!isValidObjectId(channelId)) throw new ApiError(400, "Invalid ChannelId");

  if (!isValidObjectId(userId))
    throw new ApiError(400, "Please login first to continue");

  const ChannelSubscribers = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(channelId),
      },
    },

    {
      $group: {
        _id: "$channel",
        subscribersCount: {
          $sum: 1,
        },
      },
    },

    {
      $project: {
        subscribersCount: 1,
      },
    },
  ]);

  if (!ChannelSubscribers)
    throw new ApiError(
      500,
      "there was an error while displaying your subscribers count"
    );

  console.log("channelSubscribers: ", ChannelSubscribers);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        ChannelSubscribers,
        "successfully fetched the channel's subscribers"
      )
    );
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;
  const userId = req.user?._id;

  if (!isValidObjectId(subscriberId))
    throw new ApiError(400, "Invalid SubscriberId");

  if (!isValidObjectId(userId))
    throw new ApiError(400, "Please login first to continue");

  const SubscribedChannels = await Subscription.aggregate([
    {
      $match: {
        subscriber: new mongoose.Types.ObjectId(subscriberId),
      },
    },

    {
      $group: {
        _id: "$subscriber",
        subscribedChannelCount: {
          $sum: 1,
        },
      },
    },

    {
      $project: {
        subscribedChannelCount: 1,
      },
    },
  ]);

  if (!SubscribedChannels)
    throw new ApiError(
      500,
      "there was an error while displaying your subscribers count"
    );

  console.log("channelSubscribers: ", SubscribedChannels);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        SubscribedChannels,
        "successfully fetched the subscribed channels"
      )
    );
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
