const functions = require("express").Router();

const inventory = require("./inventory");
const management = require("./management");

functions.use("/inventory", inventory);

functions.use("/management", management);

functions.get("/", (req, res) => {
  res.status(200).json({ message: "The functions are sent here" });
});

module.exports = functions;
