const successResponse = (res, message, data = null, statusCode = 200) => {
    return res.status(statusCode).json({
      success: true,
      message: message,
      data: data,
    });
  };


  
 const errorResponse = (res, message, statusCode = 500, errors = []) => {
    return res.status(statusCode).json({
      success: false,
      message: message,
      errors: errors,
    });
  };
  
  export { successResponse, errorResponse };