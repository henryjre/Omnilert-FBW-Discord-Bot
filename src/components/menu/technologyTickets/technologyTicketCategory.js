const { MessageFlags } = require('discord.js');
const { TECHNOLOGY_TICKET_CATEGORIES } = require('../../../utils/technologyTicketAi');
const {
  changeTechnologyTicketCategory,
  isTechnologyStaff,
} = require('../../../utils/technologyTicketService');
const { buildTechnologyTicketNoticePayload } = require('../../../utils/technologyTicketUi');
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
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const ticket = await changeTechnologyTicketCategory({
      client,
      threadId: interaction.channelId,
      category,
      staffId: interaction.user.id,
    });
    return interaction.editReply(
      buildTechnologyTicketNoticePayload(
        ticket ? 'Category updated' : 'Ticket unavailable',
        ticket ? `${ticket.ticket_id} is now categorized as ${category}.` : 'This thread is not a registered ticket.',
        ticket ? 0x2e8b57 : 0xc0392b
      )
    );
  },
};
