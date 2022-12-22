const express = require("express");
const bodyParser = require("body-parser");
const cors = require('cors');   
const helmet = require('helmet');
const morgan = require('morgan');

require("dotenv").config({ path: "src/.env" });
const chalk = require("chalk");
const authenticateToken = require('./auth')

const PORT = process.env.PORT;
const TOKEN = process.env.webhookToken;

const app = express()

const listen = async () => {
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(helmet());
  app.use(cors());
  app.use(morgan('combined'));

  app.get("/", (req, res) => {
    res.json("Listening for User Registrations...");
  });

  app.post("/userData", async (req, res) => {
    if (req.query.token !== TOKEN) {
      return res.sendStatus(401);
    }

    console.log(req);

    res.send("🟢 Post Successful!");
    return;
  });

  app.get("/sample", authenticateToken, async (req, res) => {

    res.send("🟢 Successful!");
    return;
  });

  app.listen(PORT, () =>
    console.log(
      chalk.yellow(`🟠 Webhook running on PORT ${PORT}`)
    )
  );
};

listen();
