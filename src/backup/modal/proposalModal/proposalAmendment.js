const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuOptionBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");

module.exports = {
  data: {
    name: "proposalAmendment",
  },
  async execute(interaction, client) {
    await interaction.deferUpdate();

    const amendmentDetails =
      interaction.fields.getTextInputValue("amendmentDetails");
    const amendmentOptions =
      interaction.fields.getTextInputValue("amendmentOptions");

    const proposalEmbed = new EmbedBuilder()
      .setTitle(`🔔 PROPOSAL AMENDMENT`)
      .setDescription(amendmentDetails)
      .addFields([
        {
          name: "Amended By",
          value: interaction.user.toString(),
        },
      ])
      .setTimestamp(Date.now())
      .setColor("Blurple");

    const selectMenuOptions = amendmentOptions.split("_").map((opt, i) => {
      return new StringSelectMenuOptionBuilder().setLabel(opt).setValue(opt);
    });

    const menu = new StringSelectMenuBuilder()
      .setCustomId("amendmentCastVote")
      .setPlaceholder("Cast your vote.")
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(selectMenuOptions);

    const endVoting = new ButtonBuilder()
      .setCustomId("amendmentEndVote")
      .setLabel("Close Voting")
      .setStyle(ButtonStyle.Danger);

    const openVoting = new ButtonBuilder()
      .setCustomId("openVoting")
      .setLabel("Open Voting")
      .setDisabled(true)
      .setStyle(ButtonStyle.Primary);

    const addAmendment = new ButtonBuilder()
      .setCustomId("addAmendment")
      .setLabel("Add Amendment")
      .setDisabled(true)
      .setStyle(ButtonStyle.Secondary);

    const mainProposalButtonRow = new ActionRowBuilder().addComponents(
      openVoting,
      addAmendment
    );

    const buttonRow = new ActionRowBuilder().addComponents(endVoting);
    const selectMenuRow = new ActionRowBuilder().addComponents(menu);

    const messageEmbed = interaction.message.embeds[0].data;

    const proposalThread = client.channels.cache.find(
      (channel) => channel.isThread() && channel.name === messageEmbed.title
    );

    await proposalThread.send({
      embeds: [proposalEmbed],
      components: [selectMenuRow, buttonRow],
    });

    await interaction.editReply({ components: [mainProposalButtonRow] });
  },
};
