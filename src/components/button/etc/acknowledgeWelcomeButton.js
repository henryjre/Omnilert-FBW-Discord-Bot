const {
  ActionRowBuilder,
  MessageFlags,
  EmbedBuilder,
  ButtonStyle,
  ButtonBuilder,
} = require("discord.js");

const hrRole = "1314815153421680640";

const techDeptChannel = "1342837831684460574";
const techRole = "1314815091908022373";

const finalTargetChannel = "1352693339421671608";

module.exports = {
  data: {
    name: `acknowledgeWelcome`,
  },
  async execute(interaction, client) {
    let messageEmbed = interaction.message.embeds[0];

    // Check if the user has valid roles
    if (!interaction.member.roles.cache.has(hrRole)) {
      const replyEmbed = new EmbedBuilder()
        .setDescription(`🔴 ERROR: You cannot use this button.`)
        .setColor("Red");

      return await interaction.reply({
        embeds: [replyEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferUpdate();

    messageEmbed.data.footer = {
      text: `HR Acknowledgement: ${interaction.member.nickname.replace(
        /^[🔴🟢]\s*/,
        ""
      )}`,
    };

    const departmentChannel = await client.channels.cache.get(techDeptChannel);

    const confirmButton = new ButtonBuilder()
      .setCustomId("technologyAcknowledgement")
      .setLabel("Acknowledge")
      .setStyle(ButtonStyle.Success);

    const buttonRow = new ActionRowBuilder().addComponents(confirmButton);

    const messagePayload = {
      embeds: [messageEmbed],
    };

    messagePayload.content = `<@&${techRole}>, please create an Odoo account first before acknowledging this request.`;
    messagePayload.components = [buttonRow];

    await departmentChannel.send(messagePayload);

    await interaction.message.delete();
  },
};
