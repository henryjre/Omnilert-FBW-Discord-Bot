const { EmbedBuilder, ChannelType } = require("discord.js");
const moment = require("moment-timezone");

const departments = require("../../../config/departments.json");
const client = require("../../../index");

const buffers = new Map();

const publishedShift = async (req, res) => {
  const { id, start_datetime } = req.body;
  const key = windowKey(req);

  if (!buffers.has(key)) buffers.set(key, []);
  buffers
    .get(key)
    .push({ id, start_datetime, payload: req.body, received_at: Date.now() });

  if (!buffers.get(key)._timer) {
    buffers.get(key)._timer = setTimeout(() => flushWindow(key), 3000);
  }

  res.sendStatus(202);
};

const processPublishedShift = async (payload) => {
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
      x_role_color,
      x_role_name,
    } = payload;

    const department = departments.find((d) => d.id === company_id);

    if (!department) throw new Error("Department not found");

    const startDateTime = formatTime(start_datetime);
    const startDate = formatDate(start_datetime);
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
        {
          name: "Duty Type",
          value: x_role_name ? `🎯 | ${x_role_name}` : "Unspecified",
        },
        { name: "Shift Start", value: `⏰ | ${startDateTime}` },
        { name: "Shift End", value: `⏰ | ${endDateTime}` },
        { name: "Allocated Hours", value: `⌛ | ${allocated_hours} hours` },
      ]);

    const roleColors = {
      0: "#FFFFFF",
      1: "#FF9C9C",
      2: "#F7C698",
      3: "#FDE388",
      4: "#BBD7F8",
      5: "#D9A8CC",
      6: "#F8D6C8",
      7: "#89E1DB",
      8: "#97A6F9",
      9: "#FF9ECC",
      10: "#B7EDBE",
      11: "#E6DBFC",
    };

    planningEmbed.setColor(roleColors[x_role_color] || "Blurple");

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
      name: `${startDate} | ${employeeName} | ${id}`,
      type: ChannelType.PublicThread,
      autoArchiveDuration: 1440,
    });

    return { ok: true, message: "Schedule logged" };
  } catch (error) {
    console.error("Schedule Error:", error);
    return { ok: false, message: error.message };
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

function formatDate(rawTime) {
  return moment
    .tz(rawTime, "YYYY-MM-DD HH:mm:ss", "UTC")
    .tz("Asia/Manila")
    .format("MMM DD, YYYY");
}

function windowKey(req) {
  const user = req.headers["x-odoo-user"] || "unknown";
  const minute = new Date().toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
  return `${user}:${minute}`;
}

async function flushWindow(key) {
  const bucket = buffers.get(key);
  if (!bucket) return;

  clearTimeout(bucket._timer);
  delete bucket._timer;

  const events = bucket.sort(
    (a, b) => new Date(a.start_datetime) - new Date(b.start_datetime)
  );

  for (const evt of events) {
    await processPublishedShift(evt.payload);
  }
  buffers.delete(key);
}
