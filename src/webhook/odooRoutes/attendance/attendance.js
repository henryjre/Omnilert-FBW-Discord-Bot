const { EmbedBuilder, ChannelType } = require("discord.js");
const moment = require("moment-timezone");

const departments = require("../../../config/departments.json");
const client = require("../../../index");
const { searchActiveAttendance } = require("../../../odooRpc");

const managementAttendanceLogChannelId = "1314413190074994690";

const attendanceCheckIn = async (req, res) => {
  try {
    const {
      id,
      x_company_id,
      check_in,
      x_cumulative_minutes,
      x_discord_id,
      x_employee_avatar,
      x_employee_contact_name,
      x_planning_slot_id,
      x_shift_start,
      x_shift_end,
      x_minutes_delta,
      x_prev_attendance_id,
    } = req.body;

    const department = departments.find((d) => d.id === x_company_id);

    if (!department) throw new Error("Department not found");

    if (x_discord_id) {
      try {
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
          const rolesToRemove = departments.map((d) => d.role).filter(Boolean);

          await discordMember.roles.remove(rolesToRemove);
          await discordMember.roles.add(department.role);
        }

        await discordMember.setNickname(currentNickname);
      } catch (error) {
        console.error("Error updating Discord member status:", error);
        // Continue execution even if Discord operations fail
      }
    }

    if (department.id === 1) {
      return await managementCheckIn(req, res);
    }

    return res.status(200).json({ ok: true, message: "Schedule logged" });
  } catch (error) {
    console.error("Schedule Error:", error);
    return res.status(500).json({ ok: false, message: error.message });
  }
};

const attendanceCheckOut = async (req, res) => {
  try {
    const {
      x_planning_slot_id,
      x_discord_id,
      check_out,
      id: attendanceId,
      x_cumulative_minutes,
      x_company_id,
    } = req.body;

    const department = departments.find((d) => d.id === x_company_id);

    if (!department) throw new Error("Department not found");

    if (x_discord_id) {
      try {
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
      } catch (error) {
        console.error("Error updating user nickname:", error);
        // Continue execution even if nickname update fails
      }
    }

    if (department.id === 1) {
      return await managementCheckOut(req, res);
    }

    const check_out_time = formatTime(check_out);
    const cumulative_minutes = formatMinutes(x_cumulative_minutes);
  } catch (error) {
    console.error("Attendance Check-Out Error:", error);
    return res.status(500).json({ ok: false, message: error.message });
  }
};

module.exports = { attendanceCheckIn, attendanceCheckOut };

////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////// MANAGEMENT CHECK-IN /////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////

const managementCheckIn = async (req, res) => {
  try {
    const {
      id,
      x_company_id,
      check_in,
      x_cumulative_minutes,
      x_discord_id,
      x_employee_avatar,
      x_employee_contact_name,
      x_prev_attendance_id,
      x_minutes_delta,
    } = req.body;

    const department = departments.find((d) => d.id === x_company_id);

    if (!department) throw new Error("Department not found");

    const checkInTime = formatTime(check_in);
    const cumulative_minutes = formatMinutes(x_cumulative_minutes);

    const employeeName =
      x_employee_contact_name?.split("-")[1]?.trim() || "Unknown";
    const attendanceLogChannel = client.channels.cache.get(
      managementAttendanceLogChannelId
    );

    if (!x_prev_attendance_id) {
      const embed = new EmbedBuilder()
        .setTitle("🗓️ Attendance Log")
        .addFields(
          { name: "Employee", value: `🪪 | ${employeeName}` },
          {
            name: "Discord User",
            value: `👤 | ${x_discord_id ? `<@${x_discord_id}>` : "N/A"}`,
          },
          { name: "Branch", value: `🛒 | ${department?.name || "Omnilert"}` },
          {
            name: "Total Working Time",
            value: `🕒 | Currently Working`,
          },
          {
            name: "Check-In",
            value: `⏱️ | ${checkInTime}`,
          }
        )
        .setColor("Green");

      if (x_employee_avatar) {
        embed.setThumbnail(x_employee_avatar);
      }

      const messagePayload = {
        content: `Attendance ID: ${id}`,
        embeds: [embed],
      };

      const logMessage = await attendanceLogChannel.send(messagePayload);
    } else {
      const channelMessages = await attendanceLogChannel.messages.fetch({
        limit: 100,
      });

      const attendanceMessage = channelMessages.find((msg) =>
        msg.content.includes(String(x_prev_attendance_id))
      );

      if (attendanceMessage) {
        const messageEmbed = attendanceMessage.embeds[0];
        const cumulativeMinutesField = messageEmbed.data.fields?.find(
          (f) => f.name === "Total Working Time"
        );
        if (cumulativeMinutesField) {
          cumulativeMinutesField.value = `🕒 | ${cumulative_minutes} as of last check-out`;
        }

        const newMessageEmbed = EmbedBuilder.from(messageEmbed)
          .addFields({ name: "Check-In", value: `⏱️ | ${checkInTime}` })
          .setColor("Green");

        await attendanceMessage.edit({
          content: `Attendance ID: ${id}`,
          embeds: [newMessageEmbed],
        });
      }
    }

    return res.status(200).json({ ok: true, message: "Attendance logged" });
  } catch (error) {
    console.error("Management Check-In Error:", error);
    return res.status(500).json({ ok: false, message: error.message });
  }
};

const managementCheckOut = async (req, res) => {
  try {
    const {
      x_discord_id,
      check_out,
      id: attendanceId,
      x_cumulative_minutes,
      x_company_id,
    } = req.body;

    const department = departments.find((d) => d.id === x_company_id);

    if (!department) throw new Error("Department not found");

    const check_out_time = formatTime(check_out);
    const cumulative_minutes = formatMinutes(x_cumulative_minutes);

    const attendanceLogChannel = client.channels.cache.get(
      managementAttendanceLogChannelId
    );

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

    const totalWorkingTime = messageEmbed.data.fields?.find(
      (f) => f.name === "Total Working Time"
    );
    if (totalWorkingTime) totalWorkingTime.value = `⏳ | ${cumulative_minutes}`;

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
    console.error("Management Check-Out Error:", error);
    return res.status(500).json({ ok: false, message: error.message });
  }
};

////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////// HELPER FUNCTIONS ///////////////////////////////////////////

function formatTime(rawTime) {
  return moment
    .tz(rawTime, "YYYY-MM-DD HH:mm:ss", "UTC")
    .tz("Asia/Manila")
    .format("MMMM D, YYYY [at] h:mm A");
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
