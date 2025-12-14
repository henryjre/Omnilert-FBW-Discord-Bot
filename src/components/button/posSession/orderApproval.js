const {
  MessageFlags,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require('discord.js');

const departments = require('../../../config/departments.json');

module.exports = {
  data: {
    name: `posOrderVerificationApprove`,
  },
  async execute(interaction, client) {
    let messageEmbed = interaction.message.embeds[0];

    const replyEmbed = new EmbedBuilder();

    const sessionField = messageEmbed.data.fields.find((f) => f.name === 'Session Name');

    const messageMention = interaction.message.mentions.users.first();

    if (interaction.user.id !== messageMention?.id) {
      replyEmbed.setDescription(`🔴 ERROR: You cannot use this button.`).setColor('Red');

      return await interaction.reply({
        embeds: [replyEmbed],
        flags: MessageFlags.Ephemeral,
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
      return await interaction.reply({
        content: `🔴 ERROR: No thread found.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    messageEmbed.data.fields.push({
      name: 'Approved By',
      value: interaction.user.toString(),
    });

    messageEmbed.data.footer = {
      text: ``,
    };

    const auditRatingMenu = new StringSelectMenuBuilder()
      .setCustomId('posAuditRatingMenu')
      .setOptions([
        new StringSelectMenuOptionBuilder().setLabel('⭐').setValue('⭐'),
        new StringSelectMenuOptionBuilder().setLabel('⭐⭐').setValue('⭐⭐'),
        new StringSelectMenuOptionBuilder().setLabel('⭐⭐⭐').setValue('⭐⭐⭐'),
        new StringSelectMenuOptionBuilder().setLabel('⭐⭐⭐⭐').setValue('⭐⭐⭐⭐'),
        new StringSelectMenuOptionBuilder().setLabel('⭐⭐⭐⭐⭐').setValue('⭐⭐⭐⭐⭐'),
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
      components: [menuRow],
    });

    await interaction.message.delete();
  },
};
