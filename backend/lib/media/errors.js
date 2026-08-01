export class MediaValidationError extends Error {
  constructor(message, code = "INVALID_MEDIA") {
    super(message);
    this.name = "MediaValidationError";
    this.code = code;
    this.statusCode = 400;
  }
}
