const {
  SlashCommandBuilder,
  MessageFlags,
  AttachmentBuilder,
  EmbedBuilder,
  ChannelType,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Testing purposes!"),
  async execute(interaction, client) {
    const message = await interaction.deferReply({
      flags: MessageFlags.Ephemeral,
    });

    if (!interaction.user.id === "748568303219245117") {
      await interaction.reply({
        content: `🔴 ERROR: This command can only be used by Waffle Man.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const embed1 = new EmbedBuilder()
      .setURL("https://omnilert.odoo.com/")
      .setDescription("Sample Embed for Testing");

    const confirmIncidentButton = new ButtonBuilder()
      .setCustomId("confimrSampleButton")
      .setLabel("Confirm")
      .setStyle(ButtonStyle.Success);

    const buttonRow1 = new ActionRowBuilder().addComponents(
      confirmIncidentButton
    );

    // Send the JSON file as an attachment
    const sampleMessage = await interaction.channel.send({
      embeds: [embed1],
      components: [buttonRow1],
    });

    const thread = await sampleMessage.startThread({
      name: `Sample Upload - ${interaction.id}`,
      autoArchiveDuration: 60, // Archive after 1 hour
      type: ChannelType.PrivateThread, // Set to 'GuildPrivateThread' if only the user should see it
    });

    await thread.send({
      content: `📸 **${interaction.user.toString()}, please upload the images or videos here as proof.**`,
    });

    const newMessage = `API Latency: ${client.ws.ping}\nClient Ping: ${
      message.createdTimestamp - interaction.createdTimestamp
    }`;

    await interaction.channel.send({
      content: newMessage,
    });

    await interaction.editReply({
      content: "Success!",
    });
  },
};
