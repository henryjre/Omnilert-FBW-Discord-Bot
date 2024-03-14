const orders = require("express").Router();
const createThread = require("./createOrderThread");
const updateThread = require("./updateOrderThread");

orders.post("/createOrderThread", createThread);
orders.post("/updateOrderThread", updateThread);

module.exports = orders;
