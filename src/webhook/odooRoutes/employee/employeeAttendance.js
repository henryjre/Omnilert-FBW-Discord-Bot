const {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} = require("discord.js");
const moment = require("moment-timezone");

const client = require("../../../index");
const { searchActiveAttendance } = require("../../../odooRpc");

const departments = [
  { id: 1, name: "DHVSU Bacolor", role: "1336992007910068225" },
  { id: 4, name: "Primark Center Guagua", role: "1336992011525558312" },
  { id: 5, name: "Robinsons Starmills CSFP", role: "1336992014545190933" },
  { id: 999, name: "Main Omnilert", role: null },
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

    if (x_discord_id) {
      const activeAttendance = await searchActiveAttendance(
        x_discord_id,
        attendanceId
      );

      if (activeAttendance.length <= 0) {
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

////////////////////////////////////////////////////////////////////////////////////////////////////////

const check_in = async (req, res) => {
  try {
    const {
      check_in,
      department_id,
      id: attendanceId,
      x_discord_id,
      x_employee_avatar,
      x_employee_contact_name,
      x_is_first_checkin,
      x_minutes_delta,
      x_planning_slot_id,
      x_punctuality,
      x_shift_end,
      x_shift_start,
      x_cumulative_minutes,
      x_prev_attendance_id,
    } = req.body;

    const check_in_time = formatTime(check_in);
    const shift_start_time = x_shift_start ? formatTime(x_shift_start) : "N/A";
    const shift_end_time = x_shift_end ? formatTime(x_shift_end) : "N/A";
    const minutes_delta = formatMinutesDelta(x_minutes_delta);
    const cumulative_minutes = formatMinutes(x_cumulative_minutes);

    const department = departments.find((d) => d.id === department_id);
    const employeeName =
      x_employee_contact_name?.split("-")[1]?.trim() || "Unknown";
    const attendanceLogChannel = client.channels.cache.get(
      "1343462713363271780"
    );

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

    if (x_is_first_checkin) {
      const embed = new EmbedBuilder()
        .setTitle("🗓️ Attendance Log")
        .addFields(
          { name: "Employee", value: `🪪 | ${employeeName}` },
          { name: "Branch", value: `🛒 | ${department?.name || "Omnilert"}` },
          {
            name: "Cumulative Working Hours",
            value: `🕒 | ${cumulative_minutes || 0}`,
          }
        )
        .setColor("Green");

      if (department) {
        embed.addFields(
          {
            name: "Shift ID",
            value: `🆔 | ${x_planning_slot_id || "N/A"}`,
          },
          {
            name: "Shift Start",
            value: `⏰ | ${shift_start_time}`,
          },
          {
            name: "Shift End",
            value: `⏰ | ${shift_end_time}`,
          }
        );
      }

      embed.addFields({
        name: "Check-In",
        value: `⏱️ | ${check_in_time}`,
      });

      if (x_employee_avatar) {
        embed.setThumbnail(x_employee_avatar);
      }

      const closeThread = new ButtonBuilder()
        .setCustomId("attendanceCloseThread")
        .setLabel("Close Thread")
        .setStyle(ButtonStyle.Danger);

      const buttonRow = new ActionRowBuilder().addComponents(closeThread);

      const logMessage = await attendanceLogChannel.send({
        content: `Attendance ID: ${attendanceId}`,
        embeds: [embed],
        components: [buttonRow],
      });

      if (x_punctuality && x_punctuality === "late") {
        const thread = await logMessage.startThread({
          name: `Tardiness Attendance - ${logMessage.id}`,
          type: ChannelType.PublicThread, // Set to 'GuildPrivateThread' if only the user should see it
          autoArchiveDuration: 1440,
        });

        const tardinessEmbed = new EmbedBuilder()
          .setDescription("## ⏰ TARDINESS AUTHORIZATION REQUEST")
          .addFields(
            {
              name: "Date",
              value: `📆 | ${moment(new Date()).format("MMMM DD, YYYY")}`,
            },
            { name: "Employee", value: `🪪 | ${employeeName}` },
            { name: "Branch", value: `🛒 | ${department?.name || "Omnilert"}` },
            {
              name: "Shift Start Date",
              value: `📅 | ${shift_start_time}`,
            },
            {
              name: "Shift End Date",
              value: `📅 | ${shift_end_time}`,
            },
            { name: "Tardiness", value: `⏳ | ${minutes_delta}` }
          )
          .setColor("#00fffd");

        const submit = new ButtonBuilder()
          .setCustomId("tardinessSubmit")
          .setLabel("Submit")
          .setDisabled(true)
          .setStyle(ButtonStyle.Success);

        const addReason = new ButtonBuilder()
          .setCustomId("tardinessAddReason")
          .setLabel("Add Reason")
          .setStyle(ButtonStyle.Primary);

        const buttonRow = new ActionRowBuilder().addComponents(
          submit,
          addReason
        );

        await thread.send({
          content: `${
            x_discord_id ? `<@${x_discord_id}>` : `<@&${department.role}>`
          }, please submit add reason and submit this tardiness request.`,
          embeds: [tardinessEmbed],
          components: [buttonRow],
        });
      }
    } else {
      const channelMessages = await attendanceLogChannel.messages.fetch({
        limit: 100,
      });
      const attendanceMessage = channelMessages.find((msg) =>
        msg.content.includes(x_prev_attendance_id)
      );

      if (attendanceMessage) {
        const messageEmbed = attendanceMessage.embeds[0];
        messageEmbed.data.fields.push({
          name: "Check-In",
          value: `⏱️ | ${check_in_time}`,
        });

        await attendanceMessage.edit({
          content: `Attendance ID: ${attendanceId}`,
          embeds: [messageEmbed],
        });
      }
    }
    return res.status(200).json({ ok: true, message: "Attendance logged" });
  } catch (error) {
    console.error("Attendance Error:", error);
    return res.status(500).json({ ok: false, message: error.message });
  }
};

////////////////////////////////////////////////////////////////////////////////////////////////////////

const check_out = async (req, res) => {
  try {
    const {
      x_discord_id,
      check_in,
      check_out,
      worked_hours,
      id: attendanceId,
      x_checkout_status,
      x_cumulative_minutes,
      x_is_final_checkout,
      x_minutes_vs_end,
      x_planning_slot_id,
      x_prev_attendance_id,
      x_shift_end,
      x_shift_start,
    } = req.body;

    const check_out_time = formatTime(check_out);
    const shift_end_time = formatTime(x_shift_end);
    const minutes_vs_end = formatShiftDelta(x_minutes_vs_end);
    const cumulative_minutes = formatMinutes(x_cumulative_minutes);

    const attendanceLogChannel = client.channels.cache.get(
      "1343462713363271780"
    );

    if (x_discord_id) {
      const activeAttendance = await searchActiveAttendance(
        x_discord_id,
        attendanceId
      );

      if (activeAttendance.length <= 0) {
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
    }

    const channelMessages = await attendanceLogChannel.messages.fetch({
      limit: 100,
    });
    const attendanceMessage = channelMessages.find((msg) =>
      msg.content.includes(attendanceId)
    );

    if (!attendanceMessage) {
      return res.status(200).json({ ok: true, message: "No message found" });
    }

    let messageEmbed = attendanceMessage.embeds[0];

    messageEmbed.data.fields.push({
      name: "Check-Out",
      value: `⏱️ | ${check_out_time}`,
    });

    messageEmbed.data.color = 9807270;

    await attendanceMessage.edit({ embeds: [messageEmbed] });

    return res
      .status(200)
      .json({ ok: true, message: "Attendance updated successfully" });
  } catch (error) {
    console.error("Attendance Error:", error);
    return res.status(500).json({ ok: false, message: error.message });
  }
};

module.exports = { employeeCheckIn, employeeCheckOut, check_in, check_out };

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

function formatMinutesDelta(x_minutes_delta) {
  if (x_minutes_delta === 0) return "On time";

  const isLate = x_minutes_delta > 0;
  const minutes = Math.abs(x_minutes_delta);

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  let parts = [];
  if (hours > 0) {
    parts.push(`${hours} hour${hours > 1 ? "s" : ""}`);
  }
  if (mins > 0) {
    parts.push(`${mins} minute${mins > 1 ? "s" : ""}`);
  }

  return parts.join(" and ") + (isLate ? " late" : " early");
}

function formatMinutes(minutes) {
  const hours = Math.floor(Math.abs(minutes) / 60);
  const mins = Math.abs(minutes) % 60;

  let parts = [];
  if (hours > 0) {
    parts.push(`${hours} hour${hours > 1 ? "s" : ""}`);
  }
  if (mins > 0) {
    parts.push(`${mins} minute${mins > 1 ? "s" : ""}`);
  }

  return parts.length > 0 ? parts.join(" and ") : "0 minutes";
}

function formatShiftDelta(minutes) {
  if (minutes === 0) return "On time";

  const isOvertime = minutes > 0;
  const absMinutes = Math.abs(minutes);

  const hours = Math.floor(absMinutes / 60);
  const mins = absMinutes % 60;

  let parts = [];
  if (hours > 0) {
    parts.push(`${hours} hour${hours > 1 ? "s" : ""}`);
  }
  if (mins > 0) {
    parts.push(`${mins} minute${mins > 1 ? "s" : ""}`);
  }

  return parts.join(" and ") + (isOvertime ? " overtime" : " undertime");
}
