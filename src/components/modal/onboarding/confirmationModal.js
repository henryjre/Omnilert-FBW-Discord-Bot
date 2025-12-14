const { ButtonBuilder, ButtonStyle, MessageFlags, ContainerBuilder } = require('discord.js');

const techRole = '1314815091908022373';

module.exports = {
  data: {
    name: 'onboardingConfirmationModal',
  },
  async execute(interaction, client) {
    await interaction.deferUpdate();

    const confirmationRoleInput = interaction.fields.getTextInputValue('confirmationRoleInput');
    const fileUpload = interaction.fields.getUploadedFiles('fileUpload');

    const confirmationRole = await interaction.guild.roles.cache.get(confirmationRoleInput);

    const uploadedFile = fileUpload.first();

    if (!confirmationRole) {
      return await interaction.followUp({
        content: `🔴 ERROR: Invalid role. Do not change the value of the confirmation input. Please try again.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const validMimeTypes = ['image/jpeg', 'image/png', 'image/jpg'];

    if (!validMimeTypes.includes(uploadedFile.contentType)) {
      return await interaction.followUp({
        content: `🔴 ERROR: Invalid file type. Please upload a JPEG, PNG, or JPG image.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    try {
      if (interaction.channel && interaction.channel.manageable) {
        const currentName = interaction.channel.name;
        if (!currentName.startsWith('⏳')) {
          await interaction.channel.setName(`⏳ ${currentName}`);
        }
      }
    } catch (error) {
      console.error('Error changing channel name:', error);
    }

    const containerComponent = new ContainerBuilder()
      .setAccentColor(confirmationRole.color)
      .addMediaGalleryComponents((mediaGallery) =>
        mediaGallery.addItems((file) => file.setURL(uploadedFile.url))
      )
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          `## Join Request\n<@&${techRole}>, ${
            interaction.member.nickname || interaction.user.username
          } has requested to join.\n\nRole: **${confirmationRole.name}**\nRole ID: **${
            confirmationRole.id
          }**\nUser ID: **${
            interaction.user.id
          }**\n\nIf this is correct, please confirm the request.`
        )
      )
      .addSeparatorComponents((separator) => separator)
      .addActionRowComponents((actionRow) =>
        actionRow.setComponents(
          new ButtonBuilder()
            .setCustomId('confirmJoinRequest')
            .setLabel('Confirm')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('rejectJoinRequest')
            .setLabel('Reject')
            .setStyle(ButtonStyle.Danger)
        )
      );

    await interaction.channel.send({
      components: [containerComponent],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
