class HttpError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

function assertHttp(condition, statusCode, message, details) {
  if (!condition) {
    throw new HttpError(statusCode, message, details);
  }
}

module.exports = {
  HttpError,
  assertHttp
};
