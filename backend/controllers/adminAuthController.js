const jwt = require("jsonwebtoken");

// The admin dashboard is a single, fixed administrator account rather than a
// row in the "users" collection (which is reserved for residents/volunteers).
// Override these via env vars in production instead of editing this file.
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@gmail.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

function generateAdminToken() {
  return jwt.sign(
    { email: ADMIN_EMAIL, role: "admin" },
    process.env.JWT_SECRET || "fallback_secret_key",
    { expiresIn: "12h" }
  );
}

// @desc    Authenticate the FloodGuard administrator
// @route   POST /api/admin/login
// @access  Public
exports.adminLogin = (req, res) => {
  const { email, password } = req.body;

  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    return res.status(200).json({
      success: true,
      email: ADMIN_EMAIL,
      role: "admin",
      token: generateAdminToken(),
    });
  }

  return res.status(401).json({ success: false, message: "Invalid administrator email or password" });
};
