const {
  ActionRowBuilder,
  MessageFlags,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
} = require("discord.js");

const moment = require("moment-timezone");

const managementRoleId = "1314413671245676685";

module.exports = {
  data: {
    name: `attendanceEndShift`,
  },
  async execute(interaction, client) {
    if (!interaction.member.roles.cache.has(managementRoleId)) {
      const mentionedUser =
        interaction.message.mentions?.users?.first() || null;
      const mentionedRole =
        interaction.message.mentions?.roles?.first() || null;

      if (mentionedUser) {
        const isNotMentionedUser = interaction.user.id !== mentionedUser.id;
        if (isNotMentionedUser) {
          return await interaction.reply({
            content: `🔴 ERROR: You cannot use this button.`,
            flags: MessageFlags.Ephemeral,
          });
        }
      }

      if (mentionedRole) {
        const doesNotHaveRole = !interaction.member.roles.cache.has(
          mentionedRole.id
        );
        if (doesNotHaveRole) {
          return await interaction.reply({
            content: `🔴 ERROR: You cannot use this button.`,
            flags: MessageFlags.Ephemeral,
          });
        }
      }
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

    const checkoutTimestamp = checkoutTimestampField.value;
    const planningStartShift = planningStartShiftEndField.value;
    const planningEndShift = planningEndShiftField.value;

    const checkoutStatus = getCheckoutStatus(
      checkoutTimestamp,
      planningStartShift,
      planningEndShift
    );

    let messagePayload = {};
    if (checkoutStatus.status === 1) {
      // early checkout
      const newCheckoutEmbed = EmbedBuilder.from(checkoutMessageEmbed.data);
      newCheckoutEmbed.setDescription(`## 🔴 EARLY CHECKOUT`).setFields(
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

      const approve = new ButtonBuilder()
        .setCustomId("attendanceLogApprove")
        .setLabel("Approve")
        .setStyle(ButtonStyle.Success);
      const reject = new ButtonBuilder()
        .setCustomId("attendanceLogReject")
        .setLabel("Reject")
        .setStyle(ButtonStyle.Danger);

      const buttonRow = new ActionRowBuilder().addComponents(approve, reject);

      await threadChannel.send({
        embeds: [embed],
        components: [buttonRow],
      });
    }

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
