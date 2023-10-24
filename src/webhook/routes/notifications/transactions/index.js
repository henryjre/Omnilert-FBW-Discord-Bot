const transactions = require("express").Router();

const approved = require("./approved");
const pending = require("./pending");
const rejected = require("./rejected");

transactions.use("/approved", approved);
transactions.use("/pending", pending);
transactions.use("/rejected", rejected);

module.exports = transactions;
