const {
  buildPortalPreviewPayload,
  ANNOUNCEMENT_TITLE_LIMIT,
  PORTAL_MESSAGE_LIMIT,
} = require('../../../functions/helpers/portalAnnouncementUtils');

module.exports = {
  data: {
    name: 'portalAnnouncementModal',
  },
  async execute(interaction, client) {
    const title = interaction.fields
      .getTextInputValue('titleInput')
      .slice(0, ANNOUNCEMENT_TITLE_LIMIT);
    const announcement = interaction.fields
      .getTextInputValue('announcementInput')
      .slice(0, PORTAL_MESSAGE_LIMIT);

    await interaction.deferReply();

    await interaction.editReply(
      buildPortalPreviewPayload({
        announcement,
        title,
        ownerId: interaction.user.id,
      })
    );
  },
};
