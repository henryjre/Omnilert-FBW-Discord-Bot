const { EmbedBuilder, ChannelType } = require("discord.js");
const moment = require("moment-timezone");

const departments = require("../../../config/departments.json");
const client = require("../../../index");

const publishedShift = async (req, res) => {
  try {
    const {
      id,
      company_id,
      end_datetime,
      start_datetime,
      x_discord_id,
      x_employee_avatar,
      x_employee_contact_name,
      name,
      allocated_hours,
    } = req.body;

    const department = departments.find((d) => d.id === company_id);

    if (!department) throw new Error("Department not found");

    const startDateTime = formatTime(start_datetime);
    const endDateTime = formatTime(end_datetime);
    const employeeName =
      x_employee_contact_name?.split("-")[1]?.trim() || "Unknown";

    if (!department.scheduleChannel)
      throw new Error("Schedule channel not found");

    const scheduleChannel = client.channels.cache.get(
      department.scheduleChannel
    );

    if (!scheduleChannel) throw new Error("Schedule channel not found");
    if (!x_discord_id) throw new Error("Discord ID not found");

    const guild = client.guilds.cache.get("1314413189613490248");
    const discordMember = guild?.members.cache.get(x_discord_id);

    const planningEmbed = new EmbedBuilder()
      .setTitle("🗓️ Shift Schedule")
      .addFields([
        { name: "ID", value: `🆔 | ${id}` },
        { name: "Employee", value: `🪪 | ${employeeName}` },
        {
          name: "Discord User",
          value: `👤 | ${x_discord_id ? `<@${x_discord_id}>` : "N/A"}`,
        },
        { name: "Branch", value: `🛒 | ${department.name}` },
        { name: "Shift Start", value: `⏰ | ${startDateTime}` },
        { name: "Shift End", value: `⏰ | ${endDateTime}` },
        { name: "Allocated Hours", value: `⌛ | ${allocated_hours} hours` },
      ]);

    if (name) {
      planningEmbed.setDescription(`ADDITIONAL NOTE:\n>>> *${name}*`);
    }

    if (x_employee_avatar) {
      planningEmbed.setThumbnail(x_employee_avatar);
    }

    const scheduleMessage = await scheduleChannel.send({
      content: `${id} | <@${x_discord_id}>`,
      embeds: [planningEmbed],
    });

    const thread = await scheduleMessage.startThread({
      name: `Attendance Thread | ${id}`,
      type: ChannelType.PublicThread,
      autoArchiveDuration: 1440,
    });

    return res.status(200).json({ ok: true, message: "Schedule logged" });
  } catch (error) {
    console.error("Schedule Error:", error);
    return res.status(500).json({ ok: false, message: error.message });
  }
};

module.exports = { publishedShift };

////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////// HELPER FUNCTIONS ///////////////////////////////////////////

function formatTime(rawTime) {
  return moment
    .tz(rawTime, "YYYY-MM-DD HH:mm:ss", "UTC")
    .tz("Asia/Manila")
    .format("MMMM D, YYYY [at] h:mm A");
}
