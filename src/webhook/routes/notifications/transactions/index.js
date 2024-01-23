const transactions = require("express").Router();

const approved = require("./approved");
const pending = require("./pending");
const rejected = require("./rejected");
const update = require("./update");

transactions.use("/approved", approved);
transactions.use("/pending", pending);
transactions.use("/rejected", rejected);
transactions.use("/update", update);

module.exports = transactions;
