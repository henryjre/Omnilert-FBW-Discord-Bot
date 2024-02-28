const shopRoutes = require("express").Router();
const lazada = require("./lazada");
const shopee = require("./shopee");

shopRoutes.use("/lazada", lazada);
shopRoutes.use("/shopee", shopee);

shopRoutes.get("/", (req, res) => {
  res.status(200).json({ message: "This is the Leviosa Shop Webhooks API" });
});

module.exports = shopRoutes;
