const {
  ActionRowBuilder,
  MessageFlags,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
} = require("discord.js");

const moment = require("moment-timezone");

module.exports = {
  data: {
    name: `sample`,
  },
  async execute(interaction, client) {
    // const permissionRole = "1314413671245676685";

    // if (!interaction.member.roles.cache.has(permissionRole)) {
    //   await interaction.reply({
    //     content: `🔴 ERROR: You cannot use this button.`,
    //     flags: MessageFlags.Ephemeral,
    //   });
    //   return;
    // }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const messageEmbed = interaction.message.embeds[0];
    const embedFields = messageEmbed.data.fields;

    const lastField = embedFields[embedFields.length - 1];

    if (lastField.name === "Check-In") {
      return await interaction.editReply({
        content: `🔴 ERROR: This employee is currently on shift.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const shiftEndField = embedFields.find((f) => f.name === "Shift End");
    const discordUserField = embedFields.find((f) => f.name === "Discord User");

    const shiftEndValue = shiftEndField?.value;
    const lastFieldValue = lastField?.value; //field should be check-out
    const discordUserValue = discordUserField?.value.split("|")[1];

    const { status, difference } = getTimeDifference(
      shiftEndValue,
      lastFieldValue
    );

    if (status !== "on_time") {
      let thread = interaction.message.thread;
      if (!thread) {
        thread = await interaction.message.startThread({
          name: `Attendance Log - ${interaction.message.id}`,
          type: ChannelType.PublicThread,
          autoArchiveDuration: 1440,
        });
      }

      const isOvertime = status === "overtime";

      const title = isOvertime
        ? "OVERTIME AUTHORIZATION REQUEST"
        : "UNDERTIME AUTHORIZATION REQUEST";
      const color = isOvertime ? "#ff00aa" : "#a600ff";
      const fieldName = isOvertime ? "Overtime" : "Undertime";

      const embed = new EmbedBuilder()
        .setDescription(`## ⏳ ${title}`)
        .addFields(
          {
            name: "Date",
            value: `📆 | ${moment(new Date()).format("MMMM DD, YYYY")}`,
          },
          { name: "Employee", value: `🪪 | ${employeeName}` },
          { name: "Branch", value: `🛒 | ${department?.name || "Omnilert"}` },
          { name: "Shift Start Date", value: `📅 | ${shift_start_time}` },
          { name: "Shift End Date", value: `📅 | ${shift_end_time}` },
          { name: fieldName, value: `⏳ | ${minutes_vs_end}` }
        )
        .setColor(color);

      const submit = new ButtonBuilder()
        .setCustomId("attendanceLogSubmit")
        .setLabel("Submit")
        .setDisabled(true)
        .setStyle(ButtonStyle.Success);

      const addReason = new ButtonBuilder()
        .setCustomId("tardinessAddReason")
        .setLabel("Add Reason")
        .setStyle(ButtonStyle.Primary);

      const buttonRow = new ActionRowBuilder().addComponents(submit, addReason);

      await thread.send({
        content: `${discordUserValue}, please add the reason and submit this ${fieldName.toLowerCase()} request.`,
        embeds: [embed],
        components: [buttonRow],
      });
    }

    const interactedMember =
      interaction.member?.nickname.replace(/^[🔴🟢]\s*/, "") ||
      interaction.user.globalName;

    messageEmbed.data.footer = {
      text: `Shift Ended By: ${interactedMember}`,
    };

    const messagePayload = {
      embeds: [messageEmbed],
    };

    if (interaction.message.thread) {
      const closeThread = new ButtonBuilder()
        .setCustomId("attendanceCloseThread")
        .setLabel("Close Thread")
        .setStyle(ButtonStyle.Danger);

      const buttonRow = new ActionRowBuilder().addComponents(closeThread);

      messagePayload.components = [buttonRow];
    }

    await interaction.message.edit(messagePayload);
  },
};

function getTimeDifference(first, second, timezone = "Asia/Manila") {
  // Clean inputs (remove emoji + pipe)
  const cleanFirst = first.replace(/^[^\|]+\|\s*/, "");
  const cleanSecond = second.replace(/^[^\|]+\|\s*/, "");

  // Parse with moment-timezone
  const start = moment.tz(cleanFirst, "MMMM DD, YYYY [at] h:mm A", timezone);
  const end = moment.tz(cleanSecond, "MMMM DD, YYYY [at] h:mm A", timezone);

  // Difference in minutes
  let diffMinutes = end.diff(start, "minutes");

  // Determine undertime / overtime
  let status = "on_time";
  if (diffMinutes < 0) {
    status = "undertime";
    diffMinutes = Math.abs(diffMinutes);
  } else if (diffMinutes > 0) {
    status = "overtime";
  }

  // Convert to hours + minutes with dynamic plural
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;

  const pluralize = (num, word) => `${num} ${word}${num === 1 ? "" : "s"}`;

  let difference = [];
  if (hours > 0) difference.push(pluralize(hours, "hour"));
  if (minutes > 0) difference.push(pluralize(minutes, "minute"));
  if (difference.length === 0) difference.push("0 minutes");

  return { status, difference: difference.join(" ") };
}
