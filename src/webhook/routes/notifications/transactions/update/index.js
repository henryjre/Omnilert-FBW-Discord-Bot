const update = require("express").Router();

const tiktokOrders = require("./updateTiktokOrder");
const lazadaOrders = require("./updateLazadaOrder");

update.post("/tiktokOrder", tiktokOrders);
update.post("/lazadaOrder", lazadaOrders);

module.exports = update;
