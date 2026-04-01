function errorHandler(err, _req, res, _next) {
  if (err && err.name === 'ValidationError') {
    const message = Object.values(err.errors || {})
      .map(function (e) {
        return e.message;
      })
      .join(', ');
    return res.status(400).json({ message: message || 'Validation failed' });
  }

  if (err && typeof err.statusCode === 'number') {
    return res.status(err.statusCode).json({ message: err.message || 'Request failed' });
  }

  console.error('[wallet-service][UNHANDLED ERROR]', err);
  return res.status(500).json({ message: 'Internal Server Error' });
}

module.exports = errorHandler;
