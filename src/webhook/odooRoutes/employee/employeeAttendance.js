const { EmbedBuilder } = require("discord.js");

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

  console.log(payload);

  const rawCheckInTime = payload.check_in;
  const formattedTime = moment
    .utc(rawCheckInTime)
    .tz("Asia/Manila")
    .format("MMMM D, YYYY [at] h:mm A");

  const department = departments.find((d) => d.id === payload.department_id);
  const attendanceId = payload.id;
  const employeeName = payload.x_employee_contact_name.split("-")[2].trim();

  const embed = new EmbedBuilder()
    .setTitle("🗓️ Attendance Log")
    .addFields(
      {
        name: "Employee",
        value: `🪪 | ${employeeName}`,
      },
      {
        name: "Branch",
        value: `🏪 | ${department}`,
      },
      {
        name: "Check-In",
        value: `⏱️ | ${formattedTime}`,
      },
      {
        name: "Check-Out",
        valud: `⏱️ | Currently Working`,
      }
    )
    .setColor("Blue");

  await client.channels.cache.get("1343462713363271780").send({
    content: `Attendance ID: ${attendanceId}`,
    embeds: [embed],
  });

  return await res.status(200).json({ ok: true, message: "success" });
};

module.exports = { employeeCheckIn };
