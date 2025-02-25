const {
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require("discord.js");

module.exports = {
  data: {
    name: `openVoting`,
  },
  async execute(interaction, client) {
    if (!interaction.member.roles.cache.has("1177271188997804123")) {
      await interaction.reply({
        content: `🔴 ERROR: You cannot use this button.`,
        ephemeral: true,
      });
      return;
    }

    await interaction.deferUpdate();

    const messageEmbed = interaction.message.embeds[0].data;
    messageEmbed.color = 5793266;
    messageEmbed.description = "This proposal is now open for voting.";
    messageEmbed.fields.push({
      name: "Number of Votes",
      value: "0",
    });

    const menu = new StringSelectMenuBuilder()
      .setCustomId("proposalCastVote")
      .setPlaceholder("Cast your vote on this proposal.")
      .setMinValues(1)
      .setMaxValues(1)
      .setOptions([
        new StringSelectMenuOptionBuilder()
          .setLabel("Approve")
          .setValue("Approve"),
        new StringSelectMenuOptionBuilder()
          .setLabel("Reject")
          .setValue("Reject"),
        new StringSelectMenuOptionBuilder()
          .setLabel("Abstain")
          .setValue("Abstain"),
      ]);

    const endVoting = new ButtonBuilder()
      .setCustomId("proposalCloseVoting")
      .setLabel("Close Voting")
      .setStyle(ButtonStyle.Danger);

    const buttonRow = new ActionRowBuilder().addComponents(endVoting);
    const selectMenuRow = new ActionRowBuilder().addComponents(menu);

    const membersWhoVoted = await interaction.guild.roles.cache
      .get("1186987728336846958")
      .members.map((m) => m);

    for (const member of membersWhoVoted) {
      await member.roles.remove("1186987728336846958");
    }

    await interaction.editReply({
      embeds: [messageEmbed],
      components: [buttonRow, selectMenuRow],
    });
  },
};
