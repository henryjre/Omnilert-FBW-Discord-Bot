const events = require("express").Router();

const onNewOrderCreate = require("./onNewOrderCreate");

events.post("/onNewOrderCreate", onNewOrderCreate);

module.exports = events;
