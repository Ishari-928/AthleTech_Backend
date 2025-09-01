// catchAsync is a utility function that helps to handle errors in asynchronous functions in a more streamlined way.

const catchAsync = (fn) => {
  const errorHandler = (req, res, next) => {
    fn(req, res, next).catch(next);
  };

  return errorHandler;
};

module.exports = { catchAsync };


//fn is the asynchronous function (like createCategory, getAllCategories, etc.) that you want to execute.
// If an error occurs, it will be caught and passed to the next middleware (usually the error handler) in the Express pipeline using next(error).
// This way, you don't have to write try-catch blocks in every async function, making your code cleaner and more maintainable.