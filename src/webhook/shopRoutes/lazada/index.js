const lazada = require("express").Router();
const webhook = require("./lazadaWebook");

lazada.post("/webhook", webhook);

module.exports = lazada;
