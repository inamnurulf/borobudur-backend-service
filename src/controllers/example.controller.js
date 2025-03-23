const CustomError = require("../helpers/CustomError");

// Get all products
const testController = async (req, res, next) => {
  try {
    console.log('Test 500 error for database logging');
    throw new Error('Test 500 error for database logging');
  } catch (error) {
    next(error);
  }
};


module.exports = {
  testController
};