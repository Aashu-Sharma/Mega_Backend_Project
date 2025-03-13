import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";

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

  console.log(req.files);

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

export { registerUser };
