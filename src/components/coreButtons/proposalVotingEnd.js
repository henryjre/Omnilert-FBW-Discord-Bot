const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports = {
  data: {
    name: `proposalVotingEnd`,
  },
  async execute(interaction, client) {
    if (interaction.user.id !== "864920050691866654") {
      await interaction.reply({
        content: `🔴 ERROR: You cannot use this button.`,
        ephemeral: true,
      });
      return;
    }
    await interaction.deferUpdate();

    const selectMenuRow = interaction.message.components[1];
    const selectMenuOptions = selectMenuRow.components[0].options;

    const totalVotingRights = selectMenuOptions.reduce(
      (accumulator, currentValue) => {
        const numericValue = Number(currentValue.value.split("_")[1]);
        return accumulator + numericValue;
      },
      0
    );

    let result = [];
    selectMenuOptions.forEach((option, index) => {
      const percentage =
        (Number(option.value.split("_")[1]) / totalVotingRights) * 100;
      result.push({
        option: option.label,
        percentage: percentage.toFixed(2),
      });
    });

    let messageEmbed = interaction.message.embeds[0];
    messageEmbed.data.fields.push({
      name: "Votes Summary",
      value: `${result
        .map((opt, i) => `- *${opt.option}*: **${opt.percentage}%**\n`)
        .join("")}`,
    });
    messageEmbed.data.description = "";
    messageEmbed.data.color = 5763720; //5763720

    const addResolution = new ButtonBuilder()
      .setCustomId("proposalResolution")
      .setLabel("Resolve")
      .setStyle(ButtonStyle.Success);

    const buttonRow = new ActionRowBuilder().addComponents(addResolution);

    await interaction.editReply({
      embeds: [messageEmbed],
      components: [buttonRow],
    });

    const membersWhoVoted = await interaction.guild.roles.cache
      .get("1186987728336846958")
      .members.map((m) => m);

    for (const member of membersWhoVoted) {
      await member.roles.remove("1186987728336846958");
    }
  },
};
