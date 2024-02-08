const shopRoutes = require("express").Router();
const lazada = require("./lazada");

shopRoutes.use("/lazada", lazada);

shopRoutes.get("/", (req, res) => {
  res.status(200).json({ message: "This is the Leviosa Shop Webhooks API" });
});

module.exports = shopRoutes;
