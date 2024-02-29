const shopee = require("express").Router();
const webhook = require("./shopeeWebhook");

shopee.post("/webhook", webhook);

module.exports = shopee;
