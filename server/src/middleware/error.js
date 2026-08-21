export function notFoundHandler(req, res) {
  res.status(404).json({ message: "Route not found." });
}

export function errorHandler(error, req, res, next) {
  console.error(error);
  const status = error.status || 500;
  res.status(status).json({
    message:
      status === 500
        ? "Unable to load your information. Please try again."
        : error.message,
  });
}
