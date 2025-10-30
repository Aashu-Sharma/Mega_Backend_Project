import { createClient } from "redis";
import { ApiError } from "../utils/apiError.js";

const redisClient = createClient({
//   url: "redis://localhost:6379",
     url: "redis://127.0.0.1:6379"
});

// redisClient.on("error", (err) => {
//     throw new ApiError(500, `Redis client Error: ${err}`);
// });

redisClient.on("connect", () => {
  console.log("Redis connected successfully");
});

try {
  await redisClient.connect();
} catch (error) {
  throw new ApiError(500, `Redis client Error: ${error.message}`);
}

export default redisClient;