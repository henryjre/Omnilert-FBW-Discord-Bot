const shopee = require("express").Router();

const order = require("./order");

shopee.use("/order", order);

module.exports = shopee;
