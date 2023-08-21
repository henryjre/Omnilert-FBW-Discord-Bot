const accounts = require("express").Router();
const frozen = require("./frozen");

accounts.post("/frozen", frozen);

module.exports = inventory;
