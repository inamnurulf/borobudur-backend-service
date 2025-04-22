exports.successResponse = ({ message = "Success", data = null, code = 200 }) => {
    return {
      status: "success",
      message,
      data,
      code,
    };
  };
  
  exports.failedResponse = ({ message = "Something went wrong", errors = null, code = 400 }) => {
    return {
      status: "error",
      message,
      errors,
      code,
    };
  };
  