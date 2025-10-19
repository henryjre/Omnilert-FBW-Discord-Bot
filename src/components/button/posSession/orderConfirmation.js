const {
  MessageFlags,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder
} = require('discord.js');

const departments = require('../../../config/departments.json');

module.exports = {
  data: {
    name: `posOrderVerificationConfirm`
  },
  async execute(interaction, client) {
    try {
      let allEmbeds = interaction.message.embeds;
      const messageEmbed = allEmbeds[0];

      const replyEmbed = new EmbedBuilder();

      const sessionField = messageEmbed.data.fields.find((f) => f.name === 'Session Name');

      const image = messageEmbed.data.image;
      const url = messageEmbed.data.url;

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

      await interaction.deferUpdate();

      if (!image && !url) {
        return await interaction.followUp({
          content: `🔴 ERROR: No proof of order found. Please send a photo as proof in the thread below and click "Confirm" to verify.`,
          flags: MessageFlags.Ephemeral
        });
      }

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
        return await interaction.followUp({
          content: `🔴 ERROR: No thread found.`,
          flags: MessageFlags.Ephemeral
        });
      }

      messageEmbed.data.fields.push({
        name: 'Confirmed By',
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
        embeds: allEmbeds,
        components: [menuRow]
      });

      if (
        interaction.message.thread &&
        interaction.message.thread.name.includes('Token Pay Proof')
      ) {
        const customerField = messageEmbed.data.fields.find((f) => f.name === 'Customer');

        const customer = customerField.value;

        if (customer !== 'No user found') {
          const confirmButton = new ButtonBuilder()
            .setCustomId('acknowledgePenalty')
            .setLabel('Acknowledge')
            .setStyle(ButtonStyle.Success);

          const acknowledgeButtonRow = new ActionRowBuilder().addComponents(confirmButton);

          const employeeNotifChannel = client.channels.cache.get('1347592755706200155');

          messageEmbed.data.description = messageEmbed.data.description.replace(
            'Verification',
            'Notification'
          );

          await employeeNotifChannel.send({
            content: customer,
            embeds: allEmbeds,
            components: [acknowledgeButtonRow]
          });
        }
      }

      // Add error handling for deletions
      try {
        if (interaction.message.thread) {
          await interaction.message.thread.delete();
        }
        await interaction.message.delete();
      } catch (error) {
        console.error('Error deleting messages:', error);
        await interaction.followUp({
          content: '🔴 ERROR: Failed to clean up messages. Please contact an administrator.',
          flags: MessageFlags.Ephemeral
        });
      }
    } catch (error) {
      console.error('Error in order confirmation:', error);
      await interaction.followUp({
        content:
          '🔴 ERROR: An error occurred while processing your confirmation. Please try again.',
        flags: MessageFlags.Ephemeral
      });
    }
  }
};
