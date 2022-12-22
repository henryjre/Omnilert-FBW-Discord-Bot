const express = require("express");
const bodyParser = require("body-parser");
const http = require("http");
require("dotenv").config({ path: "src/.env" });
const chalk = require("chalk");

const PORT = process.env.PORT;
const TOKEN = process.env.webhookToken;

const app = express()
const server = http.createServer(app)

const listen = async () => {
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));

  app.get("/", (req, res) => {
    res.json("Listening for User Registrations...");
  });

  app.post("/userData", async (req, res) => {
    if (req.query.token !== config.TOKEN) {
      return res.sendStatus(401);
    }

    console.log(req);

    res.send("🟢 Post Successful!");
    return;
  });

  app.get("/sample", async (req, res) => {
    if (req.query.token !== config.TOKEN) {
      return res.sendStatus(401);
    }

    console.log(req);

    res.send("🟢 Successful!");
    return;
  });

  server.listen(PORT, () =>
    console.log(
      chalk.yellow(`🟠 Webhook running on ${server.address().address}:${server.address().port}`)
    )
  );
};

listen();
