// 2 ways to write asyncHandler function
// 1st way
const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((error) => next(error));
  }; 
};  

// 2nd way
// const asyncHandler = (fn) => async(req, res, next) => {
//     try {
//         await fn(req, res, next);
//     } catch (error) {
//         res.status(error.code || 500).send('Internal Server Error').json({
//             success: false,
//             message: error.message
//         });
//     }
// } // higher order function - study about them

export { asyncHandler };
