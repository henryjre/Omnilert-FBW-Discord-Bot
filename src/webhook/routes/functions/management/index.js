const management = require("express").Router();

const openVoting = require("./openVoting");
const closeVoting = require("./closeVoting");
const refreshSqlConnections = require("./refreshConnections");
const checkForAnnouncements = require("./announcementReactionCheck");
const retrieveExecs = require("./retrieveExecutiveData");

management.post("/openVoting", openVoting);
management.post("/closeVoting", closeVoting);
management.get("/refreshConnections", refreshSqlConnections);
management.get("/checkAnnouncements", checkForAnnouncements);
management.get("/retrieveExecutiveData", retrieveExecs);

module.exports = management;
