const lazada = require("express").Router();
const newOrder = require("./newLazadaOrder");

lazada.post("/newOrder", newOrder);

module.exports = lazada;
