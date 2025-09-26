import {createClient} from 'redis';
import { ApiError } from '../utils/apiError.js';

const redisClient = createClient({
    url: "redis://localhost:6379",
});

redisClient.on("error", (err) => {
    throw new ApiError(500, `Redis client Error: ${err}`);
});

redisClient.on("connect", () => {
    console.log("Redis connected successfully");
});

await redisClient.connect();

export default redisClient;