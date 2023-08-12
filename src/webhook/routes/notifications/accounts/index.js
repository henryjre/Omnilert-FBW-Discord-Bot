const inventory = require("express").Router();
const logs = require("./logs");


inventory.post("/logs", logs);

module.exports = inventory;
