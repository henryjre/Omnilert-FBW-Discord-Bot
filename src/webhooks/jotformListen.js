const express = require("express");
const bodyParser = require("body-parser");
require("dotenv").config({ path: "src/.env" });
const chalk = require("chalk");

const PORT = process.env.PORT;
const TOKEN = process.env.webhookToken;

const app = express();

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

  app.listen(PORT, () =>
    console.log(chalk.yellow(`🟠 Webhook running on PORT ${PORT}`))
  );
};

listen();
