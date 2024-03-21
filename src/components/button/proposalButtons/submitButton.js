const {
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  EmbedBuilder,
} = require("discord.js");

module.exports = {
  data: {
    name: `submitProposal`,
  },
  async execute(interaction, client) {
    if (interaction.message.interaction.user.id !== interaction.user.id) {
      await interaction.reply({
        content: `You cannot use this button.`,
        ephemeral: true,
      });
      return;
    }

    await interaction.deferUpdate();

    const messageEmbed = interaction.message.embeds[0].data;
    const url = messageEmbed.url;

    const openVoting = new ButtonBuilder()
      .setCustomId("openVoting")
      .setLabel("Open Voting")
      .setStyle(ButtonStyle.Primary);

    const addAmendment = new ButtonBuilder()
      .setCustomId("addAmendment")
      .setLabel("Add Amendment")
      .setStyle(ButtonStyle.Secondary);

    const buttonRow = new ActionRowBuilder().addComponents(
      openVoting,
      addAmendment
    );

    const embed = new EmbedBuilder()
      .setDescription(
        `## Proposal Submitted\nPlease check the <#1186661471451627661> to check your proposal.`
      )
      .setColor("Green");

    delete messageEmbed.url;

    await interaction.editReply({
      embeds: [embed],
      components: [],
    });

    const submittedMessage = await client.channels.cache
      .get("1186661471451627661")
      .send({
        embeds: [messageEmbed],
        components: [buttonRow],
      });

    const thread = await submittedMessage.startThread({
      name: messageEmbed.title,
    });

    const pattern = /\d{4}-\d{4}/;
    const match = pattern.exec(messageEmbed.title);
    const proposalNumber = match && match[0];

    await thread.send({
      files: [
        {
          attachment: url,
          name: `Proposal_Details_${proposalNumber}.pdf`,
        },
      ],
    });
  },
};
