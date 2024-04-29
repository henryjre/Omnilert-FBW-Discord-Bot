const management = require("express").Router();

const openVoting = require("./openVoting");
const closeVoting = require("./closeVoting");

management.post("/openVoting", openVoting);
management.post("/closeVoting", closeVoting);

module.exports = management;
