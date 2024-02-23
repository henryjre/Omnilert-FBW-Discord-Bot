const functions = require("express").Router();

const inventory = require("./inventory");

functions.use("/inventory", inventory);

functions.get("/", (req, res) => {
  res.status(200).json({ message: "The functions are sent here" });
});

module.exports = functions;
