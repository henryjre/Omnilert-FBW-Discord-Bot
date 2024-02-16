const {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} = require("discord.js");
const moment = require("moment-timezone");
const { customAlphabet } = require("nanoid");
const nanoid = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 15);

module.exports = {
  data: new SlashCommandBuilder()
    .setName("schedule")
    .setDescription("Schedule a meeting.")
    .addStringOption((option) =>
      option
        .setName("start-time")
        .setDescription(
          "The approximate start time of the meeting. E.G. February 14, 2024 9:00 PM"
        )
        .setRequired(true)
    ),
  async execute(interaction, client) {
    const validRoles = ["1185935514042388520"];

    if (
      !interaction.member.roles.cache.some((r) => validRoles.includes(r.id))
    ) {
      await interaction.reply({
        content: `🔴 ERROR: This command can only be used by <@&1185935514042388520>.`,
        ephemeral: true,
      });
      return;
    }

    if (interaction.channelId !== "1207252051281842197") {
      await interaction.reply({
        content: `🔴 ERROR: This command can only be used in <#1207252051281842197>.`,
        ephemeral: true,
      });
      return;
    }

    const startTimeOption = interaction.options.getString("start-time");

    const startTime = moment(startTimeOption, "MMMM DD, YYYY h:mm A").tz(
      "Asia/Manila"
    );

    if (!startTime.isValid()) {
      await interaction.reply({
        content: `🔴 ERROR: Your provided **\`start-time\`** is invalid.`,
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply();

    const meetingId = nanoid();

    const newMeetingEmbed = new EmbedBuilder()
      .setDescription(
        "## New Meeting Scheduled\nPlease click the start button to start the meeting."
      )
      .setColor("Yellow")
      .addFields([
        {
          name: "Meeting ID",
          value: meetingId,
        },
        {
          name: "Meeting Host",
          value: `<@${interaction.user.id}>`,
        },
        {
          name: "Approximate Start Time",
          value: startTime.format("MMMM DD, YYYY [at] h:mm A"),
        },
      ]);

    const openMeeting = new ButtonBuilder()
      .setCustomId("openMeeting")
      .setLabel("Start")
      .setStyle(ButtonStyle.Success);

    const cancel = new ButtonBuilder()
      .setCustomId("cancelMeeting")
      .setLabel("Cancel")
      .setStyle(ButtonStyle.Danger);

    const buttonRow = new ActionRowBuilder().addComponents(openMeeting, cancel);

    await interaction.editReply({
      embeds: [newMeetingEmbed],
      components: [buttonRow],
    });
  },
};
