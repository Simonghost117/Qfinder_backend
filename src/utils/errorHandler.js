export const handleError = (res, err) => {
  const statusCode = err?.status || 500;
  const message = err?.message || 'Error interno del servidor';

  if (typeof res?.status !== 'function') {
    console.error('[❌ Res no válida]:', message, err);
    return;
  }

  if (err?.stack) {
    console.error(err.stack);
  } else {
    console.error('[❌ Error]:', message, err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    error: process.env.NODE_ENV === 'development' ? err : undefined,
  });
};

export default handleError;
