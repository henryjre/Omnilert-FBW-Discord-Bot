const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");

module.exports = {
  data: {
    name: "addMinutes",
  },
  async execute(interaction, client) {
    const validRoles = ["1176496361802301462"];

    if (
      !interaction.member.roles.cache.some((r) => validRoles.includes(r.id))
    ) {
      await interaction.reply({
        content: `🔴 ERROR: This command can only be used by <@&1176496361802301462>.`,
        ephemeral: true,
      });
      return;
    }

    const summary = interaction.fields.getTextInputValue("title");
    const meetingId = interaction.fields.getTextInputValue("meetingId");
    const documentUrl = interaction.fields.getTextInputValue("document");

    await interaction.deferReply({ ephemeral: true });

    const logsChannel = client.channels.cache.get("1207252051281842197");

    const logMessage = await logsChannel.messages.fetch().then((messages) => {
      return messages
        .filter(
          (m) =>
            m.author.bot &&
            m.embeds.length > 0 &&
            m.embeds[0].data.fields.length > 0 &&
            m.embeds[0].data.fields[0].value === meetingId
        )
        .first();
    });

    if (!logMessage) {
      await interaction.editReply({
        content: `🔴 ERROR: No meeting found with that meeting ID.`,
      });
      return;
    }

    const logEmbed = logMessage.embeds[0].data;

    if (!logEmbed.description.includes("Meeting Concluded")) {
      await interaction.editReply({
        content: `🔴 ERROR: This meeting is not yet concluded.`,
      });
      return;
    }

    logEmbed.description += `\n### *${summary}*`;

    const link = new ButtonBuilder()
      .setLabel("View Minutes")
      .setURL(documentUrl)
      .setStyle(ButtonStyle.Link);

    const buttonRow = new ActionRowBuilder().addComponents(link);

    logMessage.edit({
      embeds: [logEmbed],
      components: [buttonRow],
    });

    await interaction.editReply({
      content: `✅ SUCCESS: Your minutes of the meeting was successfully attached to the meeting with ID: **\`${meetingId}\`**.`,
    });
  },
};
