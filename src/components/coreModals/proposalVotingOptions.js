const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require("discord.js");

module.exports = {
  data: {
    name: "proposalVotingOptions",
  },
  async execute(interaction, client) {
    await interaction.deferUpdate();

    const votingOptions = interaction.fields.getTextInputValue("optionsInput");

    const selectMenuOptions = votingOptions.split(",").map((opt, i) => {
      return new StringSelectMenuOptionBuilder()
        .setLabel(opt)
        .setValue(`option${i}_0`);
    });

    let embed = interaction.message.embeds[0];

    embed.data.color = 5793266; //5763720
    embed.data.description = "This proposal is now open for voting.";

    const menu = new StringSelectMenuBuilder()
      .setCustomId("voteProposalOptions")
      .setPlaceholder("Cast your vote.")
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(selectMenuOptions);

    const endVoting = new ButtonBuilder()
      .setCustomId("proposalVotingEnd")
      .setLabel("Close Voting")
      .setStyle(ButtonStyle.Danger);

    const buttonRow = new ActionRowBuilder().addComponents(endVoting);
    const selectMenuRow = new ActionRowBuilder().addComponents(menu);

    await interaction.editReply({
      embeds: [embed],
      components: [buttonRow, selectMenuRow],
    });
  },
};
