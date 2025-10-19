const {
  ActionRowBuilder,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder
} = require('discord.js');

const departments = require('../../../config/departments.json');

module.exports = {
  data: {
    name: `posOrderVerificationRefundReason`
  },
  async execute(interaction, client) {
    let messageEmbed = interaction.message.embeds[0];

    const replyEmbed = new EmbedBuilder();

    const sessionField = messageEmbed.data.fields.find((f) => f.name === 'Session Name');
    const cashierField = messageEmbed.data.fields.find((f) => f.name === 'Cashier');

    const mentionedUser = interaction.message.mentions.users.first();
    const mentionedRole = interaction.message.mentions.roles.first();

    if (mentionedUser) {
      // Handle user mention
      const isNotMentionedUser = interaction.user.id !== mentionedUser.id;

      if (isNotMentionedUser) {
        replyEmbed.setDescription(`🔴 ERROR: You cannot use this button.`).setColor('Red');

        return await interaction.reply({
          embeds: [replyEmbed],
          flags: MessageFlags.Ephemeral
        });
      }
    } else if (mentionedRole) {
      // Handle role mention
      const doesNotHaveRole = !interaction.member.roles.cache.has(mentionedRole.id);

      if (doesNotHaveRole) {
        replyEmbed.setDescription(`🔴 ERROR: You cannot use this button.`).setColor('Red');

        return await interaction.reply({
          embeds: [replyEmbed],
          flags: MessageFlags.Ephemeral
        });
      }
    }

    const modal = new ModalBuilder()
      .setCustomId(`orderVerifRefundReason_${interaction.id}`)
      .setTitle(`POS Order Refund Reason`);

    const details = new TextInputBuilder()
      .setCustomId(`refundReason`)
      .setLabel(`Reason for Refund`)
      .setPlaceholder(`Insert the reason for refund here.`)
      .setMaxLength(1000)
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    const firstRow = new ActionRowBuilder().addComponents(details);
    modal.addComponents(firstRow);
    await interaction.showModal(modal);

    const modalResponse = await interaction.awaitModalSubmit({
      filter: async (i) => {
        const f =
          i.customId === `orderVerifRefundReason_${interaction.id}` &&
          i.user.id === interaction.user.id;

        if (f) {
          await i.deferUpdate();
        }
        return f;
      },
      time: 180000
    });

    try {
      if (modalResponse.isModalSubmit()) {
        const details = modalResponse.fields.getTextInputValue('refundReason');

        const cashierName = cashierField.value.split('-')[1];
        const sessionName = sessionField.value;

        const department = departments.find(
          (d) => d.verificationChannel === interaction.message.channelId
        );

        const posChannel = client.channels.cache.get(department.posChannel);

        const sessionMessage = await posChannel.messages
          .fetch({ limit: 100 })
          .then((messages) => messages.find((msg) => msg.content.includes(sessionName)));

        const posThread = await sessionMessage.thread;

        if (!posThread) {
          return await modalResponse.followUp({
            content: `🔴 ERROR: No thread found.`,
            flags: MessageFlags.Ephemeral
          });
        }

        if (details) {
          messageEmbed.data.description += `\n\u200b\nReason for Refund:\n> *"${details}"*\n\u200b`;
        }

        messageEmbed.data.fields.push({
          name: 'Refunded By',
          value: interaction.user.toString()
        });

        messageEmbed.data.footer = {
          text: ``
        };

        const auditRatingMenu = new StringSelectMenuBuilder()
          .setCustomId('posAuditRatingMenu')
          .setOptions([
            new StringSelectMenuOptionBuilder().setLabel('⭐').setValue('⭐'),
            new StringSelectMenuOptionBuilder().setLabel('⭐⭐').setValue('⭐⭐'),
            new StringSelectMenuOptionBuilder().setLabel('⭐⭐⭐').setValue('⭐⭐⭐'),
            new StringSelectMenuOptionBuilder().setLabel('⭐⭐⭐⭐').setValue('⭐⭐⭐⭐'),
            new StringSelectMenuOptionBuilder().setLabel('⭐⭐⭐⭐⭐').setValue('⭐⭐⭐⭐⭐')
          ])
          .setMinValues(1)
          .setMaxValues(1)
          .setPlaceholder('Select audit rating.');

        // const submit = new ButtonBuilder()
        //   .setCustomId("posOrderAudit")
        //   .setLabel("Audit")
        //   .setStyle(ButtonStyle.Primary);

        const menuRow = new ActionRowBuilder().addComponents(auditRatingMenu);
        // const buttonRow = new ActionRowBuilder().addComponents(submit);

        await posThread.send({
          embeds: [messageEmbed],
          components: [menuRow]
        });

        await interaction.message.delete();
      }
    } catch (error) {
      console.log(error);
      await modalResponse.followUp({
        content: `🔴 ERROR: An error occurred while creating your signature request. Please try again.`,
        flags: MessageFlags.Ephemeral
      });
    }
  }
};
