const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const helmet = require("helmet");

require("dotenv").config({ path: "src/.env" });
const chalk = require("chalk");
const authenticateToken = require("./auth");

const app = require('express')();
const routes = require('./routes');
const PORT = process.env.PORT;

const listen = async () => {
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(helmet());
  app.use(cors());

  app.use(authenticateToken)
  app.use('/api', routes);

  app.listen(PORT, () =>
    console.log(chalk.yellow(`🟠 Webhook running on PORT ${PORT}`))
  );
};

listen();
