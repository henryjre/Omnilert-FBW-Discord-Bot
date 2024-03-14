const orders = require("express").Router();
const createThread = require("./createOrderThread");

orders.post("/createOrderThread", createThread);

module.exports = orders;
