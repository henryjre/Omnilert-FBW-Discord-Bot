const {
  ActionRowBuilder,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

module.exports = {
  data: {
    name: `signatoriesAddTitle`,
  },
  async execute(interaction, client) {
    const replyEmbed = new EmbedBuilder();

    let allEmbeds = interaction.message.embeds;
    const messageEmbed = allEmbeds[0];

    if (
      !messageEmbed.data.fields
        .find((f) => f.name === "Prepared By")
        .value.includes(interaction.user.id)
    ) {
      replyEmbed
        .setDescription(`🔴 ERROR: You cannot use this menu.`)
        .setColor("Red");

      return await interaction.editReply({ embeds: [replyEmbed] });
    }

    const modal = new ModalBuilder()
      .setCustomId(`signatoriesAddTitle_${interaction.id}`)
      .setTitle(`Add Signatory Title`);

    const details = new TextInputBuilder()
      .setCustomId(`signatoriesTitleInput`)
      .setLabel(`Signatory Title`)
      .setPlaceholder(`Insert the signatory title.`)
      .setMaxLength(100)
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const firstRow = new ActionRowBuilder().addComponents(details);
    modal.addComponents(firstRow);
    await interaction.showModal(modal);

    const modalResponse = await interaction.awaitModalSubmit({
      filter: async (i) => {
        const f =
          i.customId === `signatoriesAddTitle_${interaction.id}` &&
          i.user.id === interaction.user.id;

        if (f) {
          await i.deferUpdate();
        }
        return f;
      },
      time: 180000,
    });

    try {
      if (modalResponse.isModalSubmit()) {
        const signatoryTitle = modalResponse.fields.getTextInputValue(
          "signatoriesTitleInput"
        );

        messageEmbed.data.description = `## ${signatoryTitle}`;

        const messageComponents = interaction.message.components;

        const embedFields = messageEmbed.data.fields;
        if (embedFields.length > 1) {
          const submitButtonRow = messageComponents.find((row) =>
            row.components.some(
              (component) => component.customId === "signatoriesSubmit"
            )
          );

          if (submitButtonRow) {
            const submitButtonIndex = submitButtonRow.components.findIndex(
              (component) => component.customId === "signatoriesSubmit"
            );

            if (submitButtonIndex !== -1) {
              submitButtonRow.components[
                submitButtonIndex
              ].data.disabled = false;
            }
          }
        }

        await interaction.message.edit({
          embeds: allEmbeds,
          components: messageComponents,
        });
      }
    } catch (error) {
      console.log(error);
      await modalResponse.followUp({
        content: `🔴 ERROR: An error occurred while adding the signatory title. Please try again.`,
        ephemeral: true,
      });
    }
  },
};
