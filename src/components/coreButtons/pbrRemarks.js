const {
  ActionRowBuilder,
  ModalBuilder,
  TextInputStyle,
  TextInputBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} = require("discord.js");

module.exports = {
  data: {
    name: `pbrRemarks`,
  },
  async execute(interaction, client) {
    const modal = new ModalBuilder();
    modal.setCustomId("addRemarksModal").setTitle("Add Remarks");

    const remark = new TextInputBuilder()
      .setCustomId(`remarks`)
      .setLabel(`Remarks Details`)
      .setPlaceholder("Justify your PBR/Criteria rating.")
      .setStyle(TextInputStyle.Paragraph)
      .setMaxLength(1024)
      .setRequired(true);

    const firstRow = new ActionRowBuilder().addComponents(remark);
    modal.addComponents(firstRow);

    await interaction.showModal(modal);

    const modalResponse = await interaction.awaitModalSubmit({
      filter: async (i) => {
        const f =
          i.customId === "addRemarksModal" && i.user.id === interaction.user.id;
        return f;
      },
      time: 240000,
    });

    try {
      if (modalResponse.isModalSubmit()) {
        await modalResponse.deferUpdate();
        const remarksInput = modalResponse.fields.getTextInputValue("remarks");

        const messageEmbed = interaction.message.embeds[0].data;
        const remarksIndex = messageEmbed.fields.findIndex(
          (f) => f.name === "Remarks"
        );

        if (remarksIndex === -1) {
          messageEmbed.fields.push({
            name: "Remarks",
            value: `*${remarksInput}*`,
          });
        } else {
          messageEmbed.fields[remarksIndex].value = `*${remarksInput}*`;
        }

        const submit = new ButtonBuilder()
          .setCustomId("pbrSubmit")
          .setLabel("Submit")
          .setDisabled(false)
          .setStyle(ButtonStyle.Success);

        const remarks = new ButtonBuilder()
          .setCustomId("pbrRemarks")
          .setLabel("Add Remarks")
          .setStyle(ButtonStyle.Primary);

        const userMenu = new StringSelectMenuBuilder(
          interaction.message.components[0].components[0].data
        );

        const buttonRow = new ActionRowBuilder().addComponents(submit, remarks);
        const menuRow = new ActionRowBuilder().addComponents(userMenu);

        await modalResponse.editReply({
          embeds: [messageEmbed],
          components: [menuRow, buttonRow],
        });
      }
    } catch (error) {
      console.log(error);
      await modalResponse
        .followUp({
          content: `🔴 ERROR: An error occurred while adding your score. Please try selecting again.`,
        })
        .then((m) => {
          setTimeout(() => {
            m.delete();
          }, 5000);
        });
    }
  },
};
