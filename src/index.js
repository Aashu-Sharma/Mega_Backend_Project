import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from './db/index.js';

dotenv.config({
    path: './env'
})


connectDB();




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