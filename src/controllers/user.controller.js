import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
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
  // res.status(200).json({
  //     message: "ok"
  // })

  // To register a user, first we need to get the values like username, email, password.

  // Once we get the values, we need to check if the user already exists in the database.

  // or if the user has send the values empty.

  // if the user exists, we need to return a response saying that the user already exists.

  // if the user does not exist, then check for the images, and avatar.

  // upload the images to cloudinary. and get the url;

  // create a user object - create entry in db;

  // when returning the response -  remove the passrord and refresh token from the user object.

  // check if the user is successfully registered;

  // if the user is successfully registered, then return a response saying that the user is successfully registered.

  // if the data is coming from the form, then we can access the data using req.body;

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

  // console.log(req.files);

  console.log("filePath: ", avatarPath, ", ", coverImagePath);

  if (!avatarPath) throw new ApiError(400, "Avatar is required");
  //   if (!coverImagePath) throw new ApiError(400, "Cover Image is required");

  const avatar = await uploadOnCloudinary(avatarPath);
  const coverImage = await uploadOnCloudinary(coverImagePath);

  if (!avatar) throw new ApiError(500, "Avatar upload failed");
  //   if(!coverImage) throw new ApiError(500, "Cover Image upload failed");

  const user = await User.create({
    fullName,
    email,
    username: username.toLowerCase(),
    password,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
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

  const { email, username, password } = req.body;
  console.log(email);
  console.log(req.body);

  if (!username && !email) throw new ApiError(401, "All fields are required");

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

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

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
          refreshToken,
        },

        "User logged in successfully"
      )
    );
});

const logOutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },

    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(201, {}, "User logged out successfully"));
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

  if(!avatar.url) throw new ApiError(400, 'Error while uploading the avatar');

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      }
    },

    {new: true}
  ).select("-password");

  return res
        .status(200)
        .json(new ApiResponse(201, user, "avatar updated successfully"))

});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverPath = req.file?.path; // multer gives acceess to req.file
  if (!coverPath) throw new ApiError(400, "Avatar file is required");

  const coverImage = await uploadOnCloudinary(coverPath);

  if(!coverImage.url) throw new ApiError(400, 'Error while uploading the coverImage');

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      }
    },

    {new: true}
  ).select("-password");

  return res
        .status(200)
        .json(new ApiResponse(201, user, "coverImage updated successfully"))

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
  updateUserCoverImage
};
