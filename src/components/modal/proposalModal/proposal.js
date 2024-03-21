const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");

module.exports = {
  data: {
    name: "proposal",
  },
  async execute(interaction, client) {
    await interaction.deferReply();

    const proposalTitle = interaction.fields.getTextInputValue("titleInput");
    const proposalNumber =
      interaction.fields.getTextInputValue("proposalNumber");
    const proposalUrl = interaction.fields.getTextInputValue("proposalLink");

    const proposalEmbed = new EmbedBuilder()
      .setTitle(`📌 LEVIOSA PROPOSAL | ${proposalNumber}`)
      .addFields([
        {
          name: "Title",
          value: proposalTitle,
        },
      ])
      .setTimestamp(Date.now())
      .setURL(proposalUrl)
      .setColor("#ffff00");

    const submit = new ButtonBuilder()
      .setCustomId("submitProposal")
      .setLabel("Submit")
      .setDisabled(true)
      .setStyle(ButtonStyle.Success);

    const cancel = new ButtonBuilder()
      .setCustomId("cancelProposal")
      .setLabel("Cancel")
      .setStyle(ButtonStyle.Danger);

    const addAuthor = new ButtonBuilder()
      .setCustomId("addAuthor")
      .setLabel("Add Author/s")
      .setStyle(ButtonStyle.Primary);

    const buttonRow = new ActionRowBuilder().addComponents(
      submit,
      cancel,
      addAuthor
    );

    await interaction.editReply({
      embeds: [proposalEmbed],
      components: [buttonRow],
    });
  },
};
