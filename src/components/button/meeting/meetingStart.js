const {
  EmbedBuilder,
  MessageFlags,
  GuildScheduledEventStatus,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} = require("discord.js");

module.exports = {
  data: {
    name: `meetingStart`,
  },
  async execute(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const replyEmbed = new EmbedBuilder();

    let allEmbeds = interaction.message.embeds;
    const messageEmbed = allEmbeds[0];

    const authorField = messageEmbed.data.fields.find(
      (f) => f.name === "Created By"
    );
    const meetingIdField = messageEmbed.data.fields.find(
      (f) => f.name === "Meeting ID"
    );

    if (!authorField.value.includes(interaction.user.id)) {
      replyEmbed
        .setDescription(`🔴 ERROR: You cannot use this button.`)
        .setColor("Red");

      return await interaction.editReply({ embeds: [replyEmbed] });
    }

    const event = await interaction.guild.scheduledEvents
      .fetch(meetingIdField.value)
      .catch(() => null);

    if (!event) {
      replyEmbed
        .setDescription(
          `🔴 ERROR: No event found with the ID ${meetingIdField.value}.`
        )
        .setColor("Red");

      return await interaction.editReply({ embeds: [replyEmbed] });
    }

    if (event.status === GuildScheduledEventStatus.Active) {
      const endMeeting = new ButtonBuilder()
        .setCustomId("meetingEnd")
        .setLabel("End")
        .setStyle(ButtonStyle.Danger);

      const buttonRow = new ActionRowBuilder().addComponents(endMeeting);

      await interaction.message.edit({
        components: [buttonRow],
      });

      replyEmbed
        .setDescription(`🔴 ERROR: Event is already active.`)
        .setColor("Red");

      return await interaction.editReply({ embeds: [replyEmbed] });
    }

    await event.setStatus(
      GuildScheduledEventStatus.Active,
      `${interaction.user.toString()} started the meeting via button.`
    );

    replyEmbed
      .setDescription(`✅ Meeting started successfully.`)
      .setColor("Green");

    return await interaction.editReply({ embeds: [replyEmbed] });
  },
};
