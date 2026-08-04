const AppError = require("./AppError");
class FileNotFoundException extends AppError {
  constructor(id) {
    super(`File not found with id: ${id}`, 404, "FILE_NOT_FOUND");
  }
}
module.exports = FileNotFoundException;
