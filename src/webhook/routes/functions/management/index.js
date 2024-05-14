const management = require("express").Router();

const openVoting = require("./openVoting");
const closeVoting = require("./closeVoting");
const refreshSqlConnections = require("./refreshConnections");

management.post("/openVoting", openVoting);
management.post("/closeVoting", closeVoting);
management.get("/refreshConnections", refreshSqlConnections);

module.exports = management;
