const update = require("express").Router();

const tiktokOrders = require("./updateTiktokOrder");

update.post("/tiktokOrders", tiktokOrders);

module.exports = update;
