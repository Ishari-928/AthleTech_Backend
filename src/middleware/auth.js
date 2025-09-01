const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const { catchAsync } = require("../utils/ErrorHandling/catchAsync");
const { UnauthorizedError, PermissionDeniedError } = require("../utils/ErrorHandling/CustomErrors");

const protect = catchAsync(async (req, _res, next) => {
  const header = req.headers.authorization;
  const cookieToken = req.cookies?.access_token;
  let token;

  console.log("Auth header:", header);
  console.log("Cookie token:", cookieToken);

  // Use header only if it's not undefined
  if (header && header.startsWith("Bearer ")) {
    const extracted = header.split(" ")[1];
    if (extracted && extracted !== "undefined") {
      token = extracted;
    }
  }

  // Always check cookie if no valid token yet
  if (!token && cookieToken) {
    token = cookieToken;
  }

  console.log("Final token:", token);

  if (!token) throw new UnauthorizedError("Authentication required.");

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    throw new UnauthorizedError("Invalid token.");
  }

  //  Use correct PK
  const user = await Admin.findByPk(decoded.id || decoded.admin_id);
  if (!user || !user.is_active)
    throw new UnauthorizedError("Invalid or inactive user.");

  req.user = {
    id: user.admin_id,
    user_role: user.user_role,
    email: user.email,
  };

  next();
});


const restrictTo = (...roles) => (req, _res, next) => {
  if (!req.user || !roles.includes(req.user.user_role)) {
    return next(new PermissionDeniedError('Permission Denied!'));
  }
  next();
};

module.exports = { protect, restrictTo };