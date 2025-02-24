const { AttachmentBuilder, EmbedBuilder } = require("discord.js");
const fs = require("fs");

const client = require("../../../index.js");

const departments = [
  {
    id: 1,
    name: "DHVSU Bacolor",
  },
  {
    id: 4,
    name: "Primark Center Guagua",
  },
  {
    id: 5,
    name: "Robinsons Starmills CSFP",
  },
  {
    id: 6,
    name: "Main Omnilert",
  },
  {
    id: 7,
    name: "JASA Hiway Guagua",
  },
];

const employeeCheckIn = async (req, res) => {
  const payload = req.body;

  const checkInTime = payload.check_in;

  const avatarBinary = payload.x_employee_avatar;
  const binaryData = Buffer.from(avatarBinary, "binary");
  fs.writeFileSync("image.png", binaryData);

  const attachment = new AttachmentBuilder("image.png");

  const embed = new EmbedBuilder()
    .setTitle("Here is your image!")
    .setImage("attachment://image.png");

  await client.channels.cache.get("1343462713363271780").send({
    embeds: [embed],
  });

  res.status(200).json({ ok: true, message: "success" });
};

module.exports = { employeeCheckIn };
