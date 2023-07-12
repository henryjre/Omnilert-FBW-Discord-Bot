const { EmbedBuilder } = require("discord.js");
const client = require("../../../../index");

module.exports = (req, res) => {
  const { leviosaId } = req.query;

  res.status(200).send("sample route");
};
