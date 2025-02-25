const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");

module.exports = {
  data: {
    name: `proposalBackButton`,
  },
  async execute(interaction, client) {
    if (interaction.message.interaction.user.id !== interaction.user.id) {
      await interaction.reply({
        content: `You cannot use this button.`,
        ephemeral: true,
      });
      return;
    }

    const messageEmbed = interaction.message.embeds[0].data;
    const authorFieldsIndex = messageEmbed.fields.findIndex((f) =>
      ["Author", "Authors"].includes(f.name)
    );

    await interaction.deferUpdate();

    const submit = new ButtonBuilder()
      .setCustomId("submitProposal")
      .setLabel("Submit")
      .setStyle(ButtonStyle.Success);

    if (authorFieldsIndex === -1) {
      submit.setDisabled(true);
    } else {
      submit.setDisabled(false);
    }

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
      components: [buttonRow],
    });
  },
};
