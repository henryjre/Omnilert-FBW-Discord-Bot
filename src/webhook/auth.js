require("dotenv").config({ path: "src/.env" });

module.exports = (req, res, next) => {
  const authToken = req.header("auth-token");
  if (!authToken)
    return res.status(401).send({
      ok: false,
      error: "Access denied. No token provided",
    });

  if (authToken != process.env.webhookToken)
    return res.status(401).send({
      ok: false,
      error: "Invalid Token",
    });

  next();
};
