const {
  SlashCommandBuilder,
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("log")
    .setDescription("Add a work log on your current shift."),
  async execute(interaction, client) {
    // if (interaction.channelId != 1049166582829559918) {
    //   await interaction.reply({
    //     content: `This command can only be used in ${interaction.guild.channels.cache
    //       .get("1049166582829559918")
    //       .toString()}`,
    //   });
    //   return;
    // }

    const modal = new ModalBuilder()
      .setCustomId("log")
      .setTitle(`Add a work log`);

    const firstLogModal = new TextInputBuilder()
      .setCustomId(`logInput1`)
      .setLabel(`Log #1`)
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder("(Required)")
      .setMaxLength(500);

    const secondLogModal = new TextInputBuilder()
      .setCustomId(`logInput2`)
      .setLabel(`Log #2`)
      .setStyle(TextInputStyle.Paragraph)
      .setMaxLength(500)
      .setPlaceholder("(Optional)")
      .setRequired(false);

    const thirdLogModal = new TextInputBuilder()
      .setCustomId(`logInput3`)
      .setLabel(`Log #3`)
      .setStyle(TextInputStyle.Paragraph)
      .setMaxLength(500)
      .setPlaceholder("(Optional)")
      .setRequired(false);

    // const fourthLogModal = new TextInputBuilder()
    //   .setCustomId(`logInput4`)
    //   .setLabel(`Image URL #1`)
    //   .setStyle(TextInputStyle.Short)
    //   .setMaxLength(500)
    //   .setPlaceholder("(Image URL if any)")
    //   .setRequired(false);

    // const fifthLogModal = new TextInputBuilder()
    //   .setCustomId(`logInput5`)
    //   .setLabel(`Image URL #2`)
    //   .setStyle(TextInputStyle.Short)
    //   .setMaxLength(500)
    //   .setPlaceholder("(Image URL if any)")
    //   .setRequired(false);

    const firstActionRow = new ActionRowBuilder().addComponents(firstLogModal);
    const secondActionRow = new ActionRowBuilder().addComponents(
      secondLogModal
    );
    const thirdActionRow = new ActionRowBuilder().addComponents(thirdLogModal);
    // const fourthActionRow = new ActionRowBuilder().addComponents(
    //   fourthLogModal
    // );
    // const fifthActionRow = new ActionRowBuilder().addComponents(fifthLogModal);

    modal.addComponents(
      firstActionRow,
      secondActionRow,
      thirdActionRow,
    );
    await interaction.showModal(modal);
  },
};
