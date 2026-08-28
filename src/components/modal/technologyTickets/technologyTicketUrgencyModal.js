const { MessageFlags } = require('discord.js');
const { markTechnologyTicketUrgent } = require('../../../utils/technologyTicketService');
const { buildTechnologyTicketNoticePayload } = require('../../../utils/technologyTicketUi');

module.exports = {
  data: { name: 'technologyTicketUrgencyModal' },
  async execute(interaction, client) {
    const ticketId = interaction.customId.split(':')[1];
    const reason = interaction.fields
      .getTextInputValue('technologyTicketUrgencyReason')
      .trim();

    if (!ticketId || reason.length < 10) {
      return interaction.reply(
        buildTechnologyTicketNoticePayload(
          'Add more detail',
          'Please explain the urgent impact using at least ten characters.',
          0xc0392b
        )
      );
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    try {
      const result = await markTechnologyTicketUrgent({
        client,
        ticketId,
        requesterId: interaction.user.id,
        reason,
      });
      const messages = {
        marked: [
          'Technology team notified',
          `${ticketId} was marked as urgent. Please avoid sending another alert unless the impact changes.`,
          0xd83c3e,
        ],
        not_requester: [
          'Requester action only',
          'Only the person who opened this ticket can mark it as urgent.',
          0xc0392b,
        ],
        inactive: ['Ticket unavailable', `${ticketId} is no longer active.`, 0xc0392b],
        not_found: ['Ticket unavailable', `${ticketId} could not be found.`, 0xc0392b],
      };

      if (result.outcome === 'cooldown') {
        const remainingMinutes = Math.max(
          1,
          Math.ceil((Date.parse(result.nextAllowedAt) - Date.now()) / 60000)
        );
        return interaction.editReply(
          buildTechnologyTicketNoticePayload(
            'Urgent alert on cooldown',
            `The Technology team was already notified. Try again in about ${remainingMinutes} minute${remainingMinutes === 1 ? '' : 's'}.`,
            0xf2a93b
          )
        );
      }

      const [title, detail, color] = messages[result.outcome] || [
        'Urgency not updated',
        'The urgency status could not be updated.',
        0xc0392b,
      ];
      return interaction.editReply(buildTechnologyTicketNoticePayload(title, detail, color));
    } catch (error) {
      console.error('Technology ticket urgency failed:', error);
      return interaction.editReply(
        buildTechnologyTicketNoticePayload(
          'Urgent alert failed',
          'The Technology team could not be notified. Please try again.',
          0xc0392b
        )
      );
    }
  },
};
