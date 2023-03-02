const routes = require("express").Router();
const database = require("./database");
const verification = require("./verification");
const events = require("./events");

routes.use("/database", database);
routes.use("/verification", verification);
routes.use("/events", events);

routes.get("/", (req, res) => {
  res.status(200).json({ message: "This is Leviosa API." });
});

module.exports = routes;
