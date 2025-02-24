const { EmbedBuilder } = require("discord.js");
const moment = require("moment-timezone");

const client = require("../../../index");

const departments = [
  {
    id: 1,
    name: "DHVSU Bacolor",
    role: "1336992007910068225",
  },
  {
    id: 4,
    name: "Primark Center Guagua",
    role: "1336992011525558312",
  },
  {
    id: 5,
    name: "Robinsons Starmills CSFP",
    role: "1336992014545190933",
  },
  {
    id: 6,
    name: "Main Omnilert",
    role: null,
  },
  {
    id: 7,
    name: "JASA Hiway Guagua",
    role: "1336991998791385129",
  },
];

const rolesToRemove = [
  "1336992007910068225",
  "1336992011525558312",
  "1336992014545190933",
  "1336991998791385129",
];

const employeeCheckIn = async (req, res) => {
  const payload = req.body;

  const rawCheckInTime = payload.check_in;
  const formattedTime = moment
    .tz(rawCheckInTime, "YYYY-MM-DD HH:mm:ss", "UTC")
    .tz("Asia/Manila")
    .format("MMMM D, YYYY [at] h:mm A");

  const department = departments.find((d) => d.id === payload.department_id);
  const attendanceId = payload.id;
  const employeeName = payload.x_employee_contact_name.split("-")[1].trim();
  const employeeDiscordId = payload.x_discord_id;

  if (employeeDiscordId && department.role) {
    const guild = client.guilds.cache.get("1314413189613490248");
    const discordMember = guild?.members.cache.get(employeeDiscordId);

    if (discordMember) {
      await discordMember.roles.remove(rolesToRemove);
      await discordMember.roles.add(department.role);
    }
  }

  const embed = new EmbedBuilder()
    .setTitle("🗓️ Attendance Log")
    .addFields(
      {
        name: "Employee",
        value: `🪪 | ${employeeName}`,
      },
      {
        name: "Branch",
        value: `🛒 | ${department.name}`,
      },
      {
        name: "Check-In",
        value: `⏱️ | ${formattedTime}`,
      },
      {
        name: "Check-Out",
        value: `⏱️ | Currently Working`,
      }
    )
    .setColor("Blue");

  await client.channels.cache.get("1343462713363271780").send({
    content: `Attendance ID: ${attendanceId}`,
    embeds: [embed],
  });

  return res.status(200).json({ ok: true, message: "success" });
};

module.exports = { employeeCheckIn };
