const routes = require("express").Router();
const notifications = require("./notifications");

routes.use("/notifications", notifications);

routes.get("/", (req, res) => {
  res.status(200).json({ message: "This is the Leviosa Wix to Discord API" });
});

module.exports = routes;
