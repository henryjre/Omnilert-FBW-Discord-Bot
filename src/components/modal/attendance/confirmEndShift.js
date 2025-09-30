const {
  ActionRowBuilder,
  MessageFlags,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");

const moment = require("moment-timezone");

const { getAttendanceById } = require("../../../odooRpc.js");
const workEntryTypes = require("../../../config/work_entry_types.json");

module.exports = {
  data: {
    name: `endShiftConfirmation`,
  },
  async execute(interaction, client) {
    const endShiftInput = interaction.fields.getTextInputValue("endShiftInput");
    if (endShiftInput.toLowerCase() !== "end") {
      return await interaction.reply({
        content: `🔴 ERROR: Type 'end' to confirm end of duty.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const threadChannel = interaction.channel;
    const originalMessage = await threadChannel.fetchStarterMessage();

    const checkoutMessageEmbed = interaction.message.embeds[0];
    const planningMessageEmbed = originalMessage.embeds[0];

    const checkoutTimestampField = checkoutMessageEmbed.data.fields.find(
      (field) => field.name === "Timestamp"
    );
    const planningStartShiftEndField = planningMessageEmbed.data.fields.find(
      (field) => field.name === "Shift Start"
    );
    const planningEndShiftField = planningMessageEmbed.data.fields.find(
      (field) => field.name === "Shift End"
    );
    const employeeNameField = planningMessageEmbed.data.fields.find(
      (field) => field.name === "Employee"
    );
    const discordUserField = planningMessageEmbed.data.fields.find(
      (field) => field.name === "Discord User"
    );
    const departmentField = planningMessageEmbed.data.fields.find(
      (field) => field.name === "Branch"
    );
    const shiftStartField = planningMessageEmbed.data.fields.find(
      (field) => field.name === "Shift Start"
    );
    const shiftEndField = planningMessageEmbed.data.fields.find(
      (field) => field.name === "Shift End"
    );
    const attendanceIdField = checkoutMessageEmbed.data.fields.find(
      (field) => field.name === "Attendance ID"
    );

    const attendanceId = attendanceIdField.value.split("|")[1].trim();

    const checkoutTimestamp = checkoutTimestampField.value;
    const planningStartShift = planningStartShiftEndField.value;
    const planningEndShift = planningEndShiftField.value;

    const checkoutStatus = getCheckoutStatus(
      checkoutTimestamp,
      planningStartShift,
      planningEndShift
    );

    const approve = new ButtonBuilder()
      .setCustomId("attendanceLogApprove")
      .setLabel("Approve")
      .setStyle(ButtonStyle.Success);
    const reject = new ButtonBuilder()
      .setCustomId("attendanceLogReject")
      .setLabel("Reject")
      .setStyle(ButtonStyle.Danger);

    const buttonRow = new ActionRowBuilder().addComponents(approve, reject);

    let messagePayload = {};
    if (checkoutStatus.status === 1) {
      // early checkout
      const newCheckoutEmbed = EmbedBuilder.from(checkoutMessageEmbed.data);
      newCheckoutEmbed.setDescription(`## 🔴 EARLY CHECKOUT`).setFields(
        {
          name: "Attendance ID",
          value: attendanceIdField.value,
        },
        {
          name: "Check-Out Time",
          value: checkoutTimestamp,
        },
        {
          name: "Planning Shift End",
          value: planningEndShift,
        },
        {
          name: "Checkout Time Difference",
          value: `⌛ | ${checkoutStatus.diff_pretty} early`,
        }
      );

      messagePayload.embeds = [newCheckoutEmbed];
      messagePayload.components = [];

      await interaction.message.edit(messagePayload);
    } else if (checkoutStatus.status === 2) {
      // late checkout
      const newCheckoutEmbed = EmbedBuilder.from(checkoutMessageEmbed.data);
      newCheckoutEmbed.setDescription(`## 🔴 LATE CHECKOUT`).setFields(
        {
          name: "Attendance ID",
          value: attendanceIdField.value,
        },
        {
          name: "Check-Out Time",
          value: checkoutTimestamp,
        },
        {
          name: "Planning Shift End",
          value: planningEndShift,
        },
        {
          name: "Checkout Time Difference",
          value: `⌛ | ${checkoutStatus.diff_pretty} late`,
        }
      );

      messagePayload.embeds = [newCheckoutEmbed];
      messagePayload.components = [];

      await interaction.message.edit(messagePayload);

      const embed = new EmbedBuilder()
        .setDescription(`## ⏰ LATE CHECKOUT APPROVAL`)
        .addFields(
          {
            name: "Attendance ID",
            value: attendanceIdField.value,
          },
          {
            name: "Date",
            value: `📆 | ${moment().format("MMMM DD, YYYY")}`,
          },
          { name: "Employee", value: employeeNameField.value },
          {
            name: "Discord User",
            value: discordUserField.value,
          },
          {
            name: "Branch",
            value: departmentField.value,
          },
          {
            name: "Shift Start Date",
            value: shiftStartField.value,
          },
          {
            name: "Shift End Date",
            value: shiftEndField.value,
          },
          {
            name: "Checkout Status",
            value: `⏱️ | ${checkoutStatus.diff_pretty} late`,
          }
        )
        .setColor("Red");

      await threadChannel.send({
        embeds: [embed],
        components: [buttonRow],
      });
    }

    const attendance = await getAttendanceById(attendanceId);
    console.log(attendance);

    const checkOut = attendance.check_out;
    const x_cumulative_minutes = attendance.x_cumulative_minutes;
    const x_shift_start = attendance.x_shift_start;
    const x_shift_end = attendance.x_shift_end;

    const overtime = calculateOvertime(
      x_shift_start,
      x_shift_end,
      checkOut,
      x_cumulative_minutes
    );

    if (!overtime) {
      await interaction.editReply({ content: `Checkout status updated.` });
    }

    const jsonPayload = {
      employee_id: attendance.employee_id[0],
      work_entry_type_id: 118,
      name: `Overtime Premium: ${attendance.x_employee_contact_name}`,
      date_start: overtime.startTime,
      date_stop: overtime.endTime,
    };

    const otPremiumEmbed = new EmbedBuilder()
      .setDescription(`## 🕙 OVERTIME PREMIUM AUTHORIZATION`)
      .addFields(
        {
          name: "Attendance ID",
          value: attendanceId,
        },
        {
          name: "Date",
          value: `📆 | ${moment().format("MMMM DD, YYYY")}`,
        },
        {
          name: "Employee",
          value: employeeNameField.value,
        },
        {
          name: "Discord User",
          value: discordUserField.value,
        },
        {
          name: "Branch",
          value: departmentField.value,
        },
        {
          name: "Prescribed Duration",
          value: `⏱️ | ${minutesToHoursFormatted(
            overtime.prescribed_duration
          )}`,
        },
        {
          name: "Total Worked Time",
          value: `⏱️ | ${minutesToHoursFormatted(x_cumulative_minutes)}`,
        },
        {
          name: "OT Premium Duration",
          value: `⌛ | ${minutesToHoursFormatted(overtime.duration)}`,
        },
        {
          name: "JSON Details",
          value: `\`\`\`${JSON.stringify(jsonPayload)}\`\`\``,
        }
      )
      .setColor(workEntryTypes.find((type) => type.id === 118).color_hex);

    await threadChannel.send({
      embeds: [otPremiumEmbed],
      components: [buttonRow],
    });

    await interaction.editReply({ content: `Checkout status updated.` });
  },
};

// Requires moment-timezone
function getCheckoutStatus(
  checkoutStr,
  startStr,
  endStr,
  timezone = "Asia/Manila"
) {
  const FORMAT = "MMMM DD, YYYY [at] h:mm A";

  // Optional cleaner (handles leading emoji + pipe like "⏱️ | ")
  const clean = (s) => s.replace(/^[^\|]+\|\s*/, "");

  const checkout = moment.tz(clean(checkoutStr), FORMAT, timezone);
  const start = moment.tz(clean(startStr), FORMAT, timezone);
  const end = moment.tz(clean(endStr), FORMAT, timezone);

  if (!checkout.isValid() || !start.isValid() || !end.isValid()) {
    throw new Error(
      "Invalid date(s). Ensure format: 'MMMM DD, YYYY at h:mm A'."
    );
  }
  if (end.isBefore(start)) {
    throw new Error("planning end must be after planning start.");
  }

  // Status logic
  let status; // 0, 1, 2 as requested
  let boundary; // "start" | "end"
  let diffMinutes = 0; // positive minutes difference from the relevant boundary

  if (checkout.isBefore(start)) {
    status = 0; // before planning start
    boundary = "start";
    diffMinutes = start.diff(checkout, "minutes");
  } else if (checkout.isSameOrBefore(end)) {
    status = 1; // between start and end (early vs end → undertime)
    boundary = "end";
    diffMinutes = end.diff(checkout, "minutes");
  } else {
    status = 2; // after end (past shift end → overtime)
    boundary = "end";
    diffMinutes = checkout.diff(end, "minutes");
  }

  // Pretty duration with dynamic plurals
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  const pluralize = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
  const pretty =
    diffMinutes === 0
      ? "0 minutes"
      : [
          hours > 0 ? pluralize(hours, "hour") : null,
          minutes > 0 ? pluralize(minutes, "minute") : null,
        ]
          .filter(Boolean)
          .join(" ");

  // Helpful human label
  const status_label =
    status === 0
      ? "before planning start"
      : status === 1
      ? "before planning end (undertime)"
      : "after planning end (overtime)";

  return {
    status, // 0 | 1 | 2
    status_label, // human-readable
    boundary, // "start" or "end" the comparison is relative to
    diff_minutes: diffMinutes,
    diff_pretty: pretty, // e.g., "1 hour 15 minutes"
    checkout_iso: checkout.toISOString(),
    start_iso: start.toISOString(),
    end_iso: end.toISOString(),
  };
}

function calculateOvertime(
  x_shift_start,
  x_shift_end,
  check_out,
  x_cumulative_minutes,
  tz = "Asia/Manila"
) {
  const fmt = "YYYY-MM-DD HH:mm:ss";

  // Parse as zoned moments
  const shiftStart = moment.tz(x_shift_start, fmt, tz);
  let shiftEnd = moment.tz(x_shift_end, fmt, tz);
  const checkOut = moment.tz(check_out, fmt, tz);

  if (!shiftStart.isValid() || !shiftEnd.isValid() || !checkOut.isValid()) {
    throw new Error("Invalid datetime format. Use 'YYYY-MM-DD HH:mm:ss'.");
  }

  // Handle overnight shifts: if end <= start, move end to next day
  if (!shiftEnd.isAfter(shiftStart)) {
    shiftEnd.add(1, "day");
  }

  // 1) prescribed_duration = (shiftEnd - shiftStart - 1 hour) in minutes
  let prescribed_duration = shiftEnd.diff(shiftStart, "minutes") - 60;
  if (prescribed_duration < 0) prescribed_duration = 0; // safety guard

  // 2) If cumulative > prescribed, overtime = difference; else, no OT
  if (x_cumulative_minutes <= prescribed_duration) {
    return null; // no overtime
  }
  const duration = x_cumulative_minutes - prescribed_duration; // minutes

  // 3) startTime = check_out + 1 minute (still in same tz)
  const startTime = checkOut.clone().add(1, "minute");

  // 4) endTime = startTime + duration minutes
  const endTime = startTime.clone().add(duration, "minutes");

  // 5) return formatted values
  return {
    prescribed_duration,
    startTime: startTime.format(fmt),
    endTime: endTime.format(fmt),
    duration, // minutes
  };
}

/**
 * Converts minutes to a formatted hours and minutes string using moment.js
 *
 * @param {number} minutes - The total minutes to convert
 * @returns {string} Formatted string in "X hour(s) Y minute(s)" format with dynamic pluralization
 * @throws {Error} If minutes is not a valid number
 */
function minutesToHoursFormatted(minutes) {
  // Validate input
  if (typeof minutes !== "number" || isNaN(minutes)) {
    throw new Error("Minutes must be a valid number");
  }

  // Create a moment duration object from minutes
  const duration = moment.duration(minutes, "minutes");

  // Extract hours and minutes from the duration
  const hours = Math.floor(duration.asHours());
  const remainingMinutes = duration.minutes();

  // Build the formatted string with dynamic pluralization
  let result = "";

  if (hours > 0) {
    result += `${hours} hour${hours !== 1 ? "s" : ""}`;
  }

  if (remainingMinutes > 0) {
    if (result) {
      result += " and ";
    }
    result += `${remainingMinutes} minute${remainingMinutes !== 1 ? "s" : ""}`;
  }

  // Handle edge case of zero minutes
  if (result === "") {
    result = "0 minutes";
  }

  return result;
}
