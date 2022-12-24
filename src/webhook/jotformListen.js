const express = require("express");
const bodyParser = require("body-parser");
const cors = require('cors');   
const helmet = require('helmet');

require("dotenv").config({ path: "src/.env" });
const chalk = require("chalk");
const authenticateToken = require('./auth')

const PORT = process.env.PORT;

const app = express()

const listen = async () => {
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(helmet());
  app.use(cors());

  app.get("/api", (req, res) => {
    res.json("Listening for User Registrations...");
  });

  app.post("/api/registerUser", authenticateToken, async (req, res) => {

    console.log(req.body)
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
