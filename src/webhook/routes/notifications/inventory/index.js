const inventory = require("express").Router();
const logs = require("./logs");


admin.get("/logs", logs);

module.exports = inventory;
