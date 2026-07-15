const {
  buildPortalPreviewPayload,
  PORTAL_MESSAGE_LIMIT,
} = require('../../../functions/helpers/portalAnnouncementUtils');

module.exports = {
  data: {
    name: 'portalAnnouncementModal',
  },
  async execute(interaction, client) {
    const announcement = interaction.fields
      .getTextInputValue('announcementInput')
      .slice(0, PORTAL_MESSAGE_LIMIT);

    await interaction.deferReply();

    await interaction.editReply(
      buildPortalPreviewPayload({
        announcement,
        ownerId: interaction.user.id,
      })
    );
  },
};
