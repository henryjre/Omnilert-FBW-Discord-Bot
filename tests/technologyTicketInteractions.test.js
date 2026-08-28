const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { ChannelType, MessageFlags } = require('discord.js');

let closeRequest;
let urgencyRequest;
let urgencyResult = { outcome: 'marked' };

const servicePath = path.resolve(__dirname, '../src/utils/technologyTicketService.js');
require.cache[servicePath] = {
  id: servicePath,
  filename: servicePath,
  loaded: true,
  exports: {
    buildTechnologyTicketListForUser: () => ({ components: [] }),
    buildTechnologyTicketStatisticsForGuild: async () => ({ components: [] }),
    claimTechnologyTicket: async () => ({ outcome: 'claimed' }),
    closeTechnologyTicket: async (request) => {
      closeRequest = request;
      return { outcome: 'closed', ticket: { ticket_id: 'TDD20260001' } };
    },
    isTechnologyStaff: (member) => Boolean(member?.isTechnologyStaff),
    getTechnologyTicket: () => ({
      ticket_id: 'TDD20260001',
      requester_id: 'requester',
      status: 'OPEN',
    }),
    markTechnologyTicketUrgent: async (request) => {
      urgencyRequest = request;
      return { ...urgencyResult, ticket: { ticket_id: request.ticketId } };
    },
    releaseTechnologyTicket: async () => ({ outcome: 'released' }),
    reopenTechnologyTicket: async () => ({ outcome: 'reopened' }),
  },
};

const button = require('../src/components/button/technologyTickets/technologyTicketButton');
const closeCommand = require('../src/commands/employeeCommands/close_thread');
const closeModal = require('../src/components/modal/technologyTickets/technologyTicketCloseModal');
const urgencyModal = require('../src/components/modal/technologyTickets/technologyTicketUrgencyModal');

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

test('Mark as Urgent opens a required reason modal for the requester', async () => {
  let modal;
  await button.execute(
    {
      customId: 'techTicket:urgent:TDD20260001',
      user: { id: 'requester' },
      showModal: async (value) => { modal = value; },
    },
    {}
  );

  const json = modal.toJSON();
  assert.equal(json.custom_id, 'technologyTicketUrgencyModal:TDD20260001');
  const input = json.components[0].components[0];
  assert.equal(input.custom_id, 'technologyTicketUrgencyReason');
  assert.equal(input.required, true);
  assert.equal(input.min_length, 10);
  assert.equal(input.max_length, 500);
  assert.equal(input.style, 2);
});

test('urgency modal submits the reason for the current requester', async () => {
  let reply;
  urgencyRequest = null;
  urgencyResult = { outcome: 'marked' };
  await urgencyModal.execute(
    {
      customId: 'technologyTicketUrgencyModal:TDD20260001',
      user: { id: 'requester' },
      fields: { getTextInputValue: () => '  Checkout is blocked at every register.  ' },
      deferReply: async () => {},
      editReply: async (payload) => { reply = payload; },
    },
    {}
  );

  assert.equal(urgencyRequest.ticketId, 'TDD20260001');
  assert.equal(urgencyRequest.requesterId, 'requester');
  assert.equal(urgencyRequest.reason, 'Checkout is blocked at every register.');
  assert.equal(Boolean(reply.flags & MessageFlags.Ephemeral), true);
});

test('urgency modal explains when another alert is on cooldown', async () => {
  let reply;
  urgencyResult = {
    outcome: 'cooldown',
    nextAllowedAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  };
  await urgencyModal.execute(
    {
      customId: 'technologyTicketUrgencyModal:TDD20260001',
      user: { id: 'requester' },
      fields: { getTextInputValue: () => 'Checkout remains blocked at every register.' },
      deferReply: async () => {},
      editReply: async (payload) => { reply = payload; },
    },
    {}
  );

  assert.match(JSON.stringify(reply.components[0].toJSON()), /Urgent alert on cooldown/);
  assert.match(JSON.stringify(reply.components[0].toJSON()), /about 15 minutes/);
});

test('/close ticket opens a required resolution modal', async () => {
  const json = closeCommand.data.toJSON();
  const ticket = json.options.find((option) => option.name === 'ticket');
  assert.ok(ticket);
  assert.equal(ticket.options?.length || 0, 0);

  let modal;
  await closeCommand.execute(
    {
      options: { getSubcommand: () => 'ticket' },
      member: { isTechnologyStaff: true },
      channel: { type: ChannelType.PrivateThread },
      showModal: async (value) => { modal = value; },
    },
    {}
  );

  const modalJson = modal.toJSON();
  assert.equal(modalJson.custom_id, 'technologyTicketCloseModal');
  const input = modalJson.components[0].components[0];
  assert.equal(input.custom_id, 'technologyTicketResolution');
  assert.equal(input.required, true);
  assert.equal(input.min_length, 5);
  assert.equal(input.max_length, 1000);
  assert.equal(input.style, 2);
});

test('resolution modal closes the ticket with the submitted resolution', async () => {
  let reply;
  closeRequest = null;
  const thread = { id: 'thread', type: ChannelType.PrivateThread };
  await closeModal.execute(
    {
      member: { isTechnologyStaff: true },
      channel: thread,
      user: { id: 'staff' },
      fields: { getTextInputValue: () => '  Replaced the damaged network cable.  ' },
      deferReply: async () => {},
      editReply: async (payload) => { reply = payload; },
    },
    { user: { id: 'bot' } }
  );

  assert.equal(closeRequest.thread, thread);
  assert.equal(closeRequest.actorId, 'staff');
  assert.equal(closeRequest.resolution, 'Replaced the damaged network cable.');
  assert.equal(Boolean(reply.flags & MessageFlags.Ephemeral), true);
});

test('resolution modal rejects a non-Technology member without closing', async () => {
  let reply;
  closeRequest = null;
  await closeModal.execute(
    {
      member: { isTechnologyStaff: false },
      channel: { id: 'thread', type: ChannelType.PrivateThread },
      reply: async (payload) => { reply = payload; },
    },
    {}
  );

  assert.equal(closeRequest, null);
  assert.equal(Boolean(reply.flags & MessageFlags.Ephemeral), true);
});
