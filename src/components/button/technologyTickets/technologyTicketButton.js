const {
  ActionRowBuilder,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const {
  buildTechnologyTicketListForUser,
  buildTechnologyTicketStatisticsForGuild,
  claimTechnologyTicket,
  getTechnologyTicket,
  isTechnologyStaff,
  releaseTechnologyTicket,
  reopenTechnologyTicket,
} = require('../../../utils/technologyTicketService');
const {
  buildTechnologyTicketMessagePayload,
  buildTechnologyTicketNoticePayload,
} = require('../../../utils/technologyTicketUi');
const { TECHNOLOGY_DEPARTMENT_ROLE_ID } = require('../../../utils/technologyTicketConstants');

module.exports = {
  data: { name: 'technologyTicketButton' },
  async execute(interaction, client) {
    const [, action, value, ownerId] = interaction.customId.split(':');

    if (action === 'open') {
      const modal = new ModalBuilder()
        .setCustomId('technologyTicketOpenModal')
        .setTitle('Open a Technology Ticket')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('technologyTicketDescription')
              .setLabel('Describe your concern or problem')
              .setPlaceholder('Tell us what happened, where it happened, and any error message you saw.')
              .setStyle(TextInputStyle.Paragraph)
              .setMinLength(5)
              .setMaxLength(4000)
              .setRequired(true)
          )
        );
      return interaction.showModal(modal);
    }

    if (action === 'list') {
      const filter = value === 'closed' ? 'closed' : 'active';
      const page = Number(interaction.customId.split(':')[3]) || 0;
      const encodedOwnerId = interaction.customId.split(':')[4];
      if (encodedOwnerId && encodedOwnerId !== interaction.user.id) {
        return interaction.reply(
          buildTechnologyTicketNoticePayload('Private ticket list', 'Only the person who opened this list can use its controls.', 0xc0392b)
        );
      }
      const payload = buildTechnologyTicketListForUser({
        userId: interaction.user.id,
        guildId: interaction.guildId,
        filter,
        page,
      });
      if (encodedOwnerId) return interaction.update({ components: payload.components });
      return interaction.reply(payload);
    }

    if (action === 'stats') {
      const page = Number(value) || 0;
      const isEphemeralMessage = interaction.message?.flags?.has?.(MessageFlags.Ephemeral);
      if (isEphemeralMessage) {
        await interaction.deferUpdate();
        const payload = await buildTechnologyTicketStatisticsForGuild(interaction.guild, page);
        return interaction.editReply({ components: payload.components });
      }
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const payload = await buildTechnologyTicketStatisticsForGuild(interaction.guild, page);
      return interaction.editReply(payload);
    }

    if (action === 'claim' || action === 'release') {
      if (!isTechnologyStaff(interaction.member)) {
        return interaction.reply(
          buildTechnologyTicketNoticePayload(
            'Staff action only',
            `Only members of the Technology and Development team (<@&${TECHNOLOGY_DEPARTMENT_ROLE_ID}>) can use this control.`,
            0xc0392b
          )
        );
      }
      const result =
        action === 'claim'
          ? await claimTechnologyTicket({ client, ticketId: value, staffId: interaction.user.id, project: false })
          : await releaseTechnologyTicket({ client, ticketId: value, staffId: interaction.user.id, project: false });
      const updated = action === 'claim' ? result.outcome === 'claimed' : result.outcome === 'released';
      if (updated) {
        const payload = buildTechnologyTicketMessagePayload(result.ticket);
        return interaction.update({
          components: payload.components,
          allowedMentions: payload.allowedMentions,
        });
      }
      const messages = {
        already_assigned_to_you: ['Already assigned', `You are already assigned to ${value}.`, 0xf2a93b],
        already_assigned: ['Already assigned', `${value} is assigned to another staff member.`, 0xf2a93b],
        not_assignee: ['Cannot release ticket', `Only the current assignee can release ${value}.`, 0xc0392b],
        unassigned: ['Already unassigned', `${value} is already unassigned.`, 0xf2a93b],
        inactive: ['Ticket unavailable', `${value} is not active.`, 0xc0392b],
      };
      const [title, detail, color] = messages[result.outcome] || ['Ticket unavailable', 'The ticket could not be updated.', 0xc0392b];
      return interaction.reply(buildTechnologyTicketNoticePayload(title, detail, color));
    }

    if (action === 'urgent') {
      const ticket = getTechnologyTicket(value);
      if (!ticket || !['OPEN', 'REOPENED'].includes(ticket.status)) {
        return interaction.reply(
          buildTechnologyTicketNoticePayload(
            'Ticket unavailable',
            `${value} is no longer active or could not be found.`,
            0xc0392b
          )
        );
      }
      if (ticket.requester_id !== interaction.user.id) {
        return interaction.reply(
          buildTechnologyTicketNoticePayload(
            'Requester action only',
            'Only the person who opened this ticket can mark it as urgent.',
            0xc0392b
          )
        );
      }

      const modal = new ModalBuilder()
        .setCustomId(`technologyTicketUrgencyModal:${value}`)
        .setTitle('Mark Ticket as Urgent')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('technologyTicketUrgencyReason')
              .setLabel('Why does this need immediate attention?')
              .setPlaceholder('Explain the immediate impact or deadline.')
              .setStyle(TextInputStyle.Paragraph)
              .setMinLength(10)
              .setMaxLength(500)
              .setRequired(true)
          )
        );
      return interaction.showModal(modal);
    }

    if (action === 'reopen') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      try {
        const result = await reopenTechnologyTicket({ client, ticketId: value, actorId: interaction.user.id });
        const success = result.outcome === 'reopened';
        return interaction.editReply(
          buildTechnologyTicketNoticePayload(
            success ? 'Ticket reopened' : 'Ticket not reopened',
            success ? `${value} is active again.` : `${value} is no longer closed or could not be found.`,
            success ? 0xf2a93b : 0xc0392b
          )
        );
      } catch (error) {
        console.error('Technology ticket reopen failed:', error);
        const missingPermission = error?.code === 50013;
        return interaction.editReply(
          buildTechnologyTicketNoticePayload(
            'Ticket could not be reopened',
            missingPermission
              ? 'The bot needs Manage Threads permission to unlock this ticket.'
              : 'The thread could not be unlocked. Please ask Technology staff to check the ticket.',
            0xc0392b
          )
        );
      }
    }

    return interaction.reply(
      buildTechnologyTicketNoticePayload('Unknown action', 'This ticket control is no longer valid.', 0xc0392b)
    );
  },
};
