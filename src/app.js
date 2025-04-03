import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser'; 

const app = express();

//app.use allows us to use middleware

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}));

// multer is a third party package that is used to handle upload files to the server
app.use(express.json({
    limit: '30kb',
}));

app.use(express.urlencoded({
    extended: true, // allows for nested objects
    limit: '20kb',
}))

app.use(express.static("public"));

app.use(cookieParser());

// routes

import userRouter from './routes/user.routes.js';

// app.get(); we are not using this because both router and controller are in a separate file. If both were to be in the same file then we would have used app.get()
app.use("/api/v1/users", userRouter);

// outcome: https://localhost:3000/api/v1/users/register



export {app}