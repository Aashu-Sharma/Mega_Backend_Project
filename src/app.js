import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import userRouter from "./routes/user.routes.js";
import videoRouter from "./routes/video.routes.js";
import commentRouter from "./routes/comment.routes.js";
import tweetRouter from "./routes/tweets.routes.js";
import playlistRouter from "./routes/playlist.routes.js";
const app = express();

//app.use allows us to use middleware

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

// multer is a third party package that is used to handle upload files to the server
app.use(
  express.json({
    limit: "30kb",
  })
);

app.use(
  express.urlencoded({
    extended: true, // allows for nested objects
    limit: "20kb",
  })
);

app.use(express.static("public"));

app.use(cookieParser());

// routes

// app.get(); we are not using this because both router and controller are in a separate file. If both were to be in the same file then we would have used app.get()
app.use("/api/v1/users", userRouter);
app.use("/api/v1/videos", videoRouter);
app.use("/api/v1/comment", commentRouter);
app.use("/api/v1/tweets", tweetRouter);
app.use("/api/v1/playlist", playlistRouter)

// outcome: https://localhost:3000/api/v1/users/register

export { app };
