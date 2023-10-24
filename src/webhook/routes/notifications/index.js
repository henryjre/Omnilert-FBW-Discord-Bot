const notifications = require("express").Router();

const inventory = require("./inventory");
const accounts = require("./accounts");
const pending = require("./pending");

notifications.use("/accounts", accounts);
notifications.use("/inventory", inventory);
notifications.use("/pending", pending);

notifications.get("/", (req, res) => {
  res.status(200).json({ message: "The notifications are sent here" });
});

module.exports = notifications;
