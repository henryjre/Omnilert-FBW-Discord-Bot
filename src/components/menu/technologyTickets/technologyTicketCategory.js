const { TECHNOLOGY_TICKET_CATEGORIES } = require('../../../utils/technologyTicketAi');
const {
  changeTechnologyTicketCategory,
  isTechnologyStaff,
} = require('../../../utils/technologyTicketService');
const {
  buildTechnologyTicketMessagePayload,
  buildTechnologyTicketNoticePayload,
} = require('../../../utils/technologyTicketUi');
const { TECHNOLOGY_DEPARTMENT_ROLE_ID } = require('../../../utils/technologyTicketConstants');

module.exports = {
  data: { name: 'technologyTicketCategory' },
  async execute(interaction, client) {
    if (!isTechnologyStaff(interaction.member)) {
      return interaction.reply(
        buildTechnologyTicketNoticePayload(
          'Staff action only',
          `Only members of <@&${TECHNOLOGY_DEPARTMENT_ROLE_ID}> can change ticket categories.`,
          0xc0392b
        )
      );
    }
    const category = interaction.values[0];
    if (!TECHNOLOGY_TICKET_CATEGORIES.includes(category)) {
      return interaction.reply(
        buildTechnologyTicketNoticePayload('Invalid category', 'Choose one of the listed ticket categories.', 0xc0392b)
      );
    }
    const ticket = await changeTechnologyTicketCategory({
      client,
      threadId: interaction.channelId,
      category,
      staffId: interaction.user.id,
      project: false,
    });
    if (!ticket) {
      return interaction.reply(
        buildTechnologyTicketNoticePayload(
          'Ticket unavailable',
          'This thread is not a registered ticket.',
          0xc0392b
        )
      );
    }
    const payload = buildTechnologyTicketMessagePayload(ticket);
    return interaction.update({
      components: payload.components,
      allowedMentions: payload.allowedMentions,
    });
  },
};
