import mongoose from "mongoose";
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt'

// both jwt and bcrypt are used to hash the password and generate the token. they deal with encryption and decryption of the password and token; jwt is used to generate the token and bcrypt is used to hash the password;

// jwt is a bearer token

// pre is a middleware that allows us to run some code before the user is saved to the database. in this case, we are hashing the password before saving it to the database.

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  }, 

  fullName: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true,
  },

  avatar: {
    type: String, // cloudinary url
    required: true,
  },

  coverImage: {
    type: String, // cloudinary url
  },

  watchHistory: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Video',
    }
  ],

  password: {
    type: String,
    required: [true, "Password is required"],
  },

  refreshToken: {
    type: String,
  }
});

userSchema.pre("save", async function (next) {
  if(!this.isModified("password")) return next();
  
  this.password = await bcrypt.hash(this.password, 10);
  next(); 
}); // it will run just before the user is saved to the database;

userSchema.methods.isPasswordCorrect = async function (password){
  return await bcrypt.compare(password, this.password)
} // when this method will be called it will compare the password sent by user and the one saved in the database in encrypted form;

userSchema.methods.generateAccessToken = function(){
  return jwt.sign({
      _id: this._id,
      username: this.username,
      email: this.email,
      fullName: this.fullName,
  }, 
  process.env.ACCESS_TOKEN_SECRET,
  {expiresIn: process.env.ACCESS_TOKEN_EXPIRY} 
) 
};

userSchema.methods.generateRefreshToken = function(){
  return jwt.sign({
    _id: this._id,
  }, 
  process.env.REFRESH_TOKEN_SECRET,
  {expiresIn: process.env.REFRESH_TOKEN_EXPIRY}
  ) 
};

export const User = mongoose.model("User", userSchema);
