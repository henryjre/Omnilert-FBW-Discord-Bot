const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { MessageFlags } = require('discord.js');

const servicePath = path.resolve(__dirname, '../src/utils/technologyTicketService.js');
require.cache[servicePath] = {
  id: servicePath,
  filename: servicePath,
  loaded: true,
  exports: {
    buildTechnologyTicketListForUser: () => ({ components: [] }),
    buildTechnologyTicketStatisticsForGuild: async () => ({ components: [] }),
    claimTechnologyTicket: async () => ({ outcome: 'claimed' }),
    closeTechnologyTicket: async () => ({ outcome: 'closed', ticket: { ticket_id: 'TDD20260001' } }),
    isTechnologyStaff: (member) => Boolean(member?.isTechnologyStaff),
    releaseTechnologyTicket: async () => ({ outcome: 'released' }),
    reopenTechnologyTicket: async () => ({ outcome: 'reopened' }),
  },
};

const button = require('../src/components/button/technologyTickets/technologyTicketButton');
const closeCommand = require('../src/commands/employeeCommands/close_thread');

test('Open Ticket shows one accessible required description field', async () => {
  let modal;
  await button.execute(
    {
      customId: 'techTicket:open',
      showModal: async (value) => { modal = value; },
    },
    {}
  );
  const json = modal.toJSON();
  assert.equal(json.components.length, 1);
  const input = json.components[0].components[0];
  assert.equal(input.custom_id, 'technologyTicketDescription');
  assert.equal(input.required, true);
  assert.equal(input.min_length, 5);
  assert.equal(input.max_length, 4000);
  assert.equal(input.style, 2);
});

test('ticket staff actions reject non-Technology members ephemerally', async () => {
  let reply;
  await button.execute(
    {
      customId: 'techTicket:claim:TDD20260001',
      member: { isTechnologyStaff: false },
      reply: async (payload) => { reply = payload; },
    },
    {}
  );
  assert.equal(Boolean(reply.flags & MessageFlags.Ephemeral), true);
  assert.equal(Boolean(reply.flags & MessageFlags.IsComponentsV2), true);
});

test('/close includes the ticket subcommand and optional resolution', () => {
  const json = closeCommand.data.toJSON();
  const ticket = json.options.find((option) => option.name === 'ticket');
  assert.ok(ticket);
  assert.equal(ticket.options[0].name, 'resolution');
  assert.equal(ticket.options[0].required, false);
  assert.equal(ticket.options[0].max_length, 1000);
});
