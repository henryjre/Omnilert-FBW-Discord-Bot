const management = require("express").Router();

const openVoting = require("./openVoting");

management.post("/openVoting", openVoting);

module.exports = management;
