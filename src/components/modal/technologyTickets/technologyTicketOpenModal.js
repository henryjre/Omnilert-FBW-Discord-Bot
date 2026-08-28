const { MessageFlags } = require('discord.js');
const { createTechnologyTicketFromDescription } = require('../../../utils/technologyTicketService');
const { buildTechnologyTicketNoticePayload } = require('../../../utils/technologyTicketUi');

module.exports = {
  data: { name: 'technologyTicketOpenModal' },
  async execute(interaction, client) {
    const description = interaction.fields.getTextInputValue('technologyTicketDescription').trim();
    if (description.length < 5) {
      return interaction.reply(
        buildTechnologyTicketNoticePayload(
          'Add more detail',
          'Please describe the concern using at least five characters.',
          0xc0392b
        )
      );
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    try {
      const ticket = await createTechnologyTicketFromDescription({ interaction, client, description });
      return interaction.editReply(
        buildTechnologyTicketNoticePayload(
          'Ticket opened',
          `${ticket.ticket_id} was created. Open it here: https://discord.com/channels/${ticket.guild_id}/${ticket.thread_id}`,
          0x2e8b57
        )
      );
    } catch (error) {
      console.error('Technology ticket creation failed:', error);
      return interaction.editReply(
        buildTechnologyTicketNoticePayload(
          'Ticket creation failed',
          `${error.ticketId ? `Reference: ${error.ticketId}. ` : ''}Please try again or contact the Technology and Development team directly.`,
          0xc0392b
        )
      );
    }
  },
};
