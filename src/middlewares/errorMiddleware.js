exports.errorHandler = (err, req, res, next) => {
  console.error("--- CLUSTER EXCEPTION ROOT ERROR TRIGGERED ---");
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Production Engine Structural Collapse.",
    error: process.env.NODE_ENV === "development" ? err : {},
  });
};
