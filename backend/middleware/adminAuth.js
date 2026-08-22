const jwt = require("jsonwebtoken");

/**
 * Protects admin-only routes. The admin dashboard uses a single fixed
 * administrator account (see controllers/adminAuthController.js) rather than
 * a User document, so this middleware simply verifies the JWT was issued to
 * that admin (role === "admin") and attaches a minimal req.admin object.
 */
const protectAdmin = (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: "Not authorized, no admin token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret_key");
    if (decoded.role !== "admin") {
      return res.status(403).json({ success: false, message: "Admin access only" });
    }
    req.admin = { email: decoded.email, role: decoded.role };
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Not authorized, invalid admin token" });
  }
};

module.exports = { protectAdmin };
