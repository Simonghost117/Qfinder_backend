export const handleError = (res, err) => {
    console.error(err.stack);
    res.status(500).json({
      success: false,
      message: err.message || 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? err : undefined
    });
  };
  
  export default handleError;