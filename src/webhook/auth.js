const jwt = require("jsonwebtoken");
require("dotenv").config({ path: "src/.env" });

module.exports = (req, res, next) => {
  const authToken = req.header("access-token");
  if (!authToken)
    return res.status(401).send({
      ok: false,
      error: "Access denied. No token provided",
    });

  try {
    const decoded = jwt.verify(token, process.env.jwtToken);
    req.user = decoded;
  } catch (error) {
    return res.status(401).send({
      ok: false,
      error: "Invalid Token",
    });
  }

  next();
};
