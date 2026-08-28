const { ChannelType, MessageFlags } = require('discord.js');
const {
  closeTechnologyTicket,
  isTechnologyStaff,
} = require('../../../utils/technologyTicketService');
const { buildTechnologyTicketNoticePayload } = require('../../../utils/technologyTicketUi');
const { TECHNOLOGY_DEPARTMENT_ROLE_ID } = require('../../../utils/technologyTicketConstants');

module.exports = {
  data: { name: 'technologyTicketCloseModal' },
  async execute(interaction, client) {
    if (!isTechnologyStaff(interaction.member)) {
      return interaction.reply(
        buildTechnologyTicketNoticePayload(
          'Technology staff only',
          `Only members of <@&${TECHNOLOGY_DEPARTMENT_ROLE_ID}> can close help tickets.`,
          0xc0392b
        )
      );
    }
    if (interaction.channel.type !== ChannelType.PrivateThread) {
      return interaction.reply(
        buildTechnologyTicketNoticePayload(
          'Use this inside a ticket',
          'This resolution form only works inside a registered private help-ticket thread.',
          0xc0392b
        )
      );
    }

    const resolution = interaction.fields
      .getTextInputValue('technologyTicketResolution')
      .trim();
    if (resolution.length < 5) {
      return interaction.reply(
        buildTechnologyTicketNoticePayload(
          'Add more detail',
          'Please describe the resolution using at least five characters.',
          0xc0392b
        )
      );
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    try {
      const result = await closeTechnologyTicket({
        client,
        thread: interaction.channel,
        actorId: interaction.user.id,
        resolution,
      });
      const success = result.outcome === 'closed';
      const detail =
        result.outcome === 'not_ticket'
          ? 'This private thread is not a registered Technology Department ticket.'
          : result.outcome === 'already_closed'
            ? `${result.ticket.ticket_id} is already closed.`
            : `${result.ticket.ticket_id} was resolved, locked, and archived.`;
      return interaction.editReply(
        buildTechnologyTicketNoticePayload(
          success ? 'Ticket closed' : 'Ticket not closed',
          detail,
          success ? 0x2e8b57 : 0xc0392b
        )
      );
    } catch (error) {
      console.error('Technology ticket close failed:', error);
      return interaction.editReply(
        buildTechnologyTicketNoticePayload(
          'Ticket close incomplete',
          'The ticket state could not be fully synchronized. Check the thread and try again.',
          0xc0392b
        )
      );
    }
  },
};
