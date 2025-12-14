const {
  ActionRowBuilder,
  MessageFlags,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  LabelBuilder,
} = require('discord.js');

const signatoriesChannel = '1392386510858227884';

module.exports = {
  data: {
    name: `signatoriesReject`,
  },
  async execute(interaction, client) {
    const replyEmbed = new EmbedBuilder();

    let allEmbeds = interaction.message.embeds;
    const messageEmbed = allEmbeds[0];

    const files = interaction.message.attachments.map((a) => a.url);

    const mentionable = messageEmbed.data.fields.find((f) => f.name.includes('Prepared By'));

    const signingUser = messageEmbed.data.fields.find((f) => f.value.includes('⌛'));

    if (signingUser.value.includes('To be signed')) {
      const fieldValue = signingUser.value.split(' - ');

      const roleMention = fieldValue[1];
      const roleId = roleMention.replace(/[<@&>]/g, '');

      if (!interaction.guild.members.cache.get(interaction.user.id).roles.cache.has(roleId)) {
        replyEmbed.setDescription(`🔴 ERROR: You cannot sign this request.`).setColor('Red');

        return await interaction.editReply({ embeds: [replyEmbed] });
      }
    } else {
      if (!signingUser.value.includes(interaction.user.id)) {
        replyEmbed.setDescription(`🔴 ERROR: You cannot sign this request.`).setColor('Red');

        return await interaction.editReply({ embeds: [replyEmbed] });
      }
    }

    const signedUser = interaction.member.nickname.replace(/^[🔴🟢]\s*/, '') + ' - Rejected ❌';
    signingUser.value = signedUser;

    const modal = new ModalBuilder()
      .setCustomId(`rejectRequest_${interaction.id}`)
      .setTitle(`Reject and Return Signatory`);

    const details = new TextInputBuilder()
      .setCustomId(`additionalNotes`)
      .setMaxLength(1000)
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    const label = new LabelBuilder()
      .setLabel('Reason for Rejection')
      .setDescription('Insert the rejection details here.')
      .setTextInputComponent(details);

    modal.addLabelComponents(label);
    await interaction.showModal(modal);

    const modalResponse = await interaction.awaitModalSubmit({
      filter: async (i) => {
        const f =
          i.customId === `rejectRequest_${interaction.id}` && i.user.id === interaction.user.id;

        if (f) {
          await i.deferUpdate();
        }
        return f;
      },
      time: 180000,
    });

    try {
      if (modalResponse.isModalSubmit()) {
        const details = modalResponse.fields.getTextInputValue('additionalNotes');

        messageEmbed.data.footer = {
          text: `Returned By: ${interaction.member.nickname.replace(
            /^[🔴🟢]\s*/,
            ''
          )}\nReason: ${details}`,
        };

        messageEmbed.data.color = 15548997;

        await client.channels.cache
          .get(signatoriesChannel)
          .send({
            content: mentionable.value.replace(/(\n|\u200b)/g, ''),
            embeds: allEmbeds,
            files: files,
          })
          .then((msg) => {
            interaction.message.delete();
          });
      }
    } catch (error) {
      console.log(error);
      // await modalResponse.followUp({
      //   content: `🔴 ERROR: An error occurred while creating your signature request. Please try again.`,
      //   ephemeral: true,
      // });
    }
  },
};
