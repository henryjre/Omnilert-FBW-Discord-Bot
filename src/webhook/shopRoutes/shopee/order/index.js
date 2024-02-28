const order = require("express").Router();

const orderUpdatePush = require("./orderUpdate");

order.post("/orderUpdate", orderUpdatePush);

module.exports = order;
