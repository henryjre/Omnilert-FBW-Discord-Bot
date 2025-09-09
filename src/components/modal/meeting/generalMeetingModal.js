const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");

const moment = require("moment-timezone");

module.exports = {
  data: {
    name: "generalMeetingModal",
  },
  async execute(interaction, client) {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    const meetingAgenda = interaction.fields.getTextInputValue("meetingAgenda");
    const startDate = interaction.fields.getTextInputValue("startDate");
    const startTime = interaction.fields.getTextInputValue("startTime");

    let parsedDateTime;

    try {
      parsedDateTime = parseDateTime(startDate, startTime);
    } catch (error) {
      return await interaction.editReply({
        content: `🔴 ERROR: Invalid date or time format. Please try again.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const meetingEmbed = new EmbedBuilder()
      .setDescription(`## 📅 GENERAL MEETING`)
      .addFields([
        {
          name: "Meeting Agenda",
          value: `${meetingAgenda}`,
        },
        {
          name: "Meeting Date",
          value: `${parsedDateTime.formatted}`,
        },
        { name: "Created By", value: `${interaction.user.toString()}` },
        { name: "Participants", value: `All employees.` },
      ])
      .setColor("Blurple");

    const submit = new ButtonBuilder()
      .setCustomId("meetingConfirm")
      .setLabel("Confirm")
      .setStyle(ButtonStyle.Success);

    const cancel = new ButtonBuilder()
      .setCustomId("meetingCancel")
      .setLabel("Cancel")
      .setStyle(ButtonStyle.Danger);

    const buttonRow = new ActionRowBuilder().addComponents(submit, cancel);

    await interaction.channel.send({
      embeds: [meetingEmbed],
      components: [buttonRow],
    });

    await interaction.editReply({
      content: `✅ Add participants or confirm the meeting.`,
      flags: MessageFlags.Ephemeral,
    });
  },
};

function parseDateTime(dateStr, timeStr, timezone = "Asia/Manila") {
  if (!dateStr) {
    dateStr = moment().tz(timezone).format("MMMM D, YYYY");
  }

  const dateTimeStr = `${dateStr} ${timeStr}`;
  const format = "MMMM D, YYYY h:mm A";

  const m = moment.tz(dateTimeStr, format, true, timezone);

  if (!m.isValid()) {
    return null; // return null instead of throwing
  }

  return {
    date: m.toDate(), // JS Date object
    formatted: m.format("MMMM D, YYYY [at] h:mm A"), // formatted string
  };
}
