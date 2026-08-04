const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    error.isJoi = true;
    return next(error);
  }
  next();
};

module.exports = validate;
