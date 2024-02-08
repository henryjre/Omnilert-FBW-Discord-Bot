const lazada = require("express").Router();
const newOrder = require("./lazadaWebook");

lazada.post("/webhook", newOrder);

module.exports = lazada;
