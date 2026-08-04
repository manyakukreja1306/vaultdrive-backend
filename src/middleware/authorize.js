const UnauthorizedException = require("../exceptions/UnauthorizedException");

const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new UnauthorizedException("You do not have permission to access this resource"));
  }
  next();
};

module.exports = authorize;
