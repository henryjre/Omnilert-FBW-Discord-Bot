const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require("discord.js");

const moment = require("moment-timezone");

const management = require("../../../config/management.json");

module.exports = {
  data: {
    name: "managementMeetingModal",
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

    if (!parsedDateTime) {
      return await interaction.editReply({
        content: `🔴 ERROR: Invalid date or time format. Please try again.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const managementRole = await interaction.guild.roles.cache.get(
      "1314413671245676685"
    );

    const meetingEmbed = new EmbedBuilder()
      .setDescription(`## 📅 MANAGEMENT MEETING`)
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
        { name: "Participants", value: `All management members.` },
      ])
      .setColor(managementRole.color);

    const membersWithManagementRoles = await managementRole.members.map((m) => {
      const name = m.nickname.replace(/^[🔴🟢]\s*/, "") || m.user.username;
      return new StringSelectMenuOptionBuilder()
        .setLabel(name)
        .setValue(m.user.id);
    });

    // Add "All" option at the beginning of the options
    const allOptions = [
      new StringSelectMenuOptionBuilder()
        .setLabel("All")
        .setDescription("Select all management members")
        .setValue("all_users"),
    ].concat(membersWithManagementRoles);

    const managementMenu = new StringSelectMenuBuilder()
      .setCustomId("meetingMenu")
      .setOptions(allOptions)
      .setMinValues(0)
      .setMaxValues(membersWithManagementRoles.length + 1) // Increased max to include "All" option
      .setPlaceholder("Select specific participants.");

    const managementMenuRow = new ActionRowBuilder().addComponents(
      managementMenu
    );

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
      components: [managementMenuRow, buttonRow],
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
