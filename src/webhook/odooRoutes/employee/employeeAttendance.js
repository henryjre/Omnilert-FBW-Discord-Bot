const { EmbedBuilder } = require("discord.js");
const moment = require("moment-timezone");

const client = require("../../../index");
const { searchActiveAttendance } = require("../../../odooRpc");

const departments = [
  { id: 1, name: "DHVSU Bacolor", role: "1336992007910068225" },
  { id: 4, name: "Primark Center Guagua", role: "1336992011525558312" },
  { id: 5, name: "Robinsons Starmills CSFP", role: "1336992014545190933" },
  { id: 6, name: "Main Omnilert", role: null },
  { id: 7, name: "JASA Hiway Guagua", role: "1336991998791385129" },
];

const rolesToRemove = departments.map((d) => d.role).filter(Boolean);

// ✅ Employee Check-In
const employeeCheckIn = async (req, res) => {
  try {
    const {
      check_in,
      department_id,
      id: attendanceId,
      x_employee_contact_name,
      x_discord_id,
      x_employee_avatar,
    } = req.body;
    const formattedTime = formatTime(check_in);
    const department = departments.find((d) => d.id === department_id);
    const employeeName =
      x_employee_contact_name?.split("-")[1]?.trim() || "Unknown";

    const attendanceChannel = client.channels.cache.get("1343462713363271780");
    if (!attendanceChannel) throw new Error("Attendance channel not found");

    const channelMessages = await attendanceChannel.messages.fetch({
      limit: 100,
    });
    const attendanceMessage = channelMessages.find((msg) =>
      msg.content.includes(attendanceId)
    );

    if (attendanceMessage) {
      const messageEmbed = attendanceMessage.embeds[0];
      const checkInField = messageEmbed?.data.fields?.find(
        (f) => f.name === "Check-In"
      );
      if (checkInField) checkInField.value = formattedTime;

      await attendanceMessage.edit({ embeds: [messageEmbed] });
      return res.status(200).json({ ok: true, message: "Attendance updated" });
    }

    // ✅ Handle role updates
    if (x_discord_id) {
      const guild = client.guilds.cache.get("1314413189613490248");
      const discordMember = guild?.members.cache.get(x_discord_id);
      let currentNickname =
        discordMember.nickname || discordMember.user.username;

      if (currentNickname.includes("🔴")) {
        currentNickname = currentNickname.replace("🔴", "🟢");
      } else if (!currentNickname.startsWith("🟢")) {
        currentNickname = "🟢 " + currentNickname;
      }

      if (department?.role) {
        await discordMember.roles.remove(rolesToRemove);
        await discordMember.roles.add(department.role);
      }

      await discordMember.setNickname(currentNickname);
    }

    // ✅ Create and send new attendance log
    const embed = new EmbedBuilder()
      .setTitle("🗓️ Attendance Log")
      .addFields(
        { name: "Employee", value: `🪪 | ${employeeName}` },
        { name: "Branch", value: `🛒 | ${department?.name || "Unknown"}` },
        { name: "Check-In", value: `⏱️ | ${formattedTime}` },
        { name: "Check-Out", value: `⏱️ | Currently Working` }
      )
      .setColor("Blue");

    if (x_employee_avatar) {
      embed.setThumbnail(x_employee_avatar);
    }

    await attendanceChannel.send({
      content: `Attendance ID: ${attendanceId}`,
      embeds: [embed],
    });

    return res.status(200).json({ ok: true, message: "Attendance logged" });
  } catch (error) {
    console.error("Check-In Error:", error);
    return res.status(500).json({ ok: false, message: error.message });
  }
};

///////////////////////////////////////////////////////////////////////////////////////////

const employeeCheckOut = async (req, res) => {
  try {
    const {
      x_discord_id,
      check_in,
      check_out,
      worked_hours,
      id: attendanceId,
    } = req.body;

    const activeAttendance = await searchActiveAttendance(x_discord_id);
    console.log(activeAttendance);

    if (x_discord_id) {
      const guild = client.guilds.cache.get("1314413189613490248");
      const discordMember = guild?.members.cache.get(x_discord_id);
      let currentNickname =
        discordMember.nickname || discordMember.user.username;

      if (currentNickname.includes("🟢")) {
        currentNickname = currentNickname.replace("🟢", "🔴");
      } else if (!currentNickname.startsWith("🔴")) {
        currentNickname = "🔴 " + currentNickname;
      }

      await discordMember.setNickname(currentNickname);
    }

    const formattedCheckIn = formatTime(check_in);
    const formattedCheckOut = formatTime(check_out);
    const workHours = convertWorkHours(worked_hours);

    const attendanceChannel = client.channels.cache.get("1343462713363271780");
    if (!attendanceChannel) throw new Error("Attendance channel not found");

    const channelMessages = await attendanceChannel.messages.fetch({
      limit: 100,
    });
    const attendanceMessage = channelMessages.find((msg) =>
      msg.content.includes(attendanceId)
    );

    if (!attendanceMessage) {
      return res.status(200).json({ ok: true, message: "No message found" });
    }

    let messageEmbed = attendanceMessage.embeds[0];
    if (!messageEmbed) {
      return res
        .status(500)
        .json({ ok: false, message: "Message has no embeds" });
    }

    const checkInField = messageEmbed.data.fields?.find(
      (f) => f.name === "Check-In"
    );
    const checkOutField = messageEmbed.data.fields?.find(
      (f) => f.name === "Check-Out"
    );
    const hoursWorkedField = messageEmbed.data.fields?.find(
      (f) => f.name === "Hours Worked"
    );

    if (checkInField) checkInField.value = `⏱️ | ${formattedCheckIn}`;
    if (checkOutField) checkOutField.value = `⏱️ | ${formattedCheckOut}`;
    if (hoursWorkedField) {
      hoursWorkedField.value = `⏳ | ${workHours}`;
    } else {
      messageEmbed.data.fields.push({
        name: "Hours Worked",
        value: `⏳ | ${workHours}`,
      });
    }

    messageEmbed.data.color = 9807270;

    await attendanceMessage.edit({ embeds: [messageEmbed] });

    return res
      .status(200)
      .json({ ok: true, message: "Attendance updated successfully" });
  } catch (error) {
    console.error("Check-Out Error:", error);
    return res.status(500).json({ ok: false, message: error.message });
  }
};

module.exports = { employeeCheckIn, employeeCheckOut };

// ✅ Time Formatting Helper
function formatTime(rawTime) {
  return moment
    .tz(rawTime, "YYYY-MM-DD HH:mm:ss", "UTC")
    .tz("Asia/Manila")
    .format("MMMM D, YYYY [at] h:mm A");
}

// ✅ Work Hours Conversion Helper
function convertWorkHours(decimalHours) {
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);

  if (hours > 0 && minutes > 0)
    return `${hours} ${hours === 1 ? "hour" : "hours"} and ${minutes} ${
      minutes === 1 ? "minute" : "minutes"
    }`;
  if (hours > 0) return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  if (minutes > 0) return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;

  return "0 minutes";
}
