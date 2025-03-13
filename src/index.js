import dotenv from 'dotenv';
import connectDB from './db/index.js'; 
import { app } from './app.js';
// import { asyncHandler } from './utils/asyncHandler.js';

dotenv.config({
    path: '../.env'
})

const port = process.env.PORT || 5000;

connectDB()
.then(() => {
    app.on('error', (error) => {
        console.error('Error: ', error);
        throw error;    
    })

    app.listen(port,  () => {
        console.log(`Server is running on port ${port}`);
    });

}).catch((error) => {
    console.log('MongoDB connection failed... : ', error);
})

// asyncHandler(connectDB()).then(() => {
//     app.on('error', (error) => {
//         console.error('Error: ', error);
//         throw error
//     })
//     app.listen(port, () => {
//         console.log(`Server is running on port ${port}`);
//     })
// }).catch((error) => {
//     console.log('MongoDB connection failed... : ', error);
// })

/*

_______________First Approach_______________________

import express from 'express';

const app = express();

( async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_Name}`);
        app.on('error', (error) => {
            console.error('Error: ', error);
            throw error;
        });

        app.listen(process.env.PORT, () => {
            console.log(`Server is running on port ${process.env.PORT}`);
        })
    } catch (error) {
        console.error('Error: ', error);
        throw error;
    }
})() // IIFE _ Immediately Invoked Function Expression; revise the concept
 */