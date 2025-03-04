import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}));

// multer is a third party package that is used to handle upload files to the server
app.use(express.json({
    limit: '20kb',
}));

app.use(express.urlencoded({
    extended: true, //  allows for nested objects
    limit: '20kb',
}))

app.use(express.static("public"));

app.use(cookieParser())

export {app}