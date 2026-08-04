const AppError = require("./AppError");
class UnauthorizedException extends AppError {
  constructor(message = "Forbidden") {
    super(message, 403, "UNAUTHORIZED");
  }
}
module.exports = UnauthorizedException;
