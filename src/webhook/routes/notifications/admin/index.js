const admin = require("express").Router();
const notify = require("./notify");


admin.get("/notify", notify);

module.exports = admin;
