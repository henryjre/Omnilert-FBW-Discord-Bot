const notifications = require("express").Router();
const sample = require("./sample");
const admin = require("./admin");
const inventory = require("./inventory");

notifications.use("/admin", admin);
notifications.use("/inventory", inventory);

notifications.get("/sample", sample);

notifications.get("/", (req, res) => {
  res.status(200).json({ message: "The notifications are sent here" });
});

module.exports = notifications;
