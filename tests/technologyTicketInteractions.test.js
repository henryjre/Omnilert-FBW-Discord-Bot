const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { ChannelType, MessageFlags } = require('discord.js');

let closeRequest;
let urgencyRequest;
let urgencyResult = { outcome: 'marked' };
let reopenError = null;

function mockTicket(overrides = {}) {
  return {
    ticket_id: 'TDD20260001',
    title: 'Office Printer Offline',
    description: 'The office printer is offline.',
    category: 'Hardware',
    status: 'OPEN',
    requester_id: 'requester',
    assigned_to_id: 'staff',
    created_at: '2026-08-28T00:00:00.000Z',
    ...overrides,
  };
}

const servicePath = path.resolve(__dirname, '../src/utils/technologyTicketService.js');
require.cache[servicePath] = {
  id: servicePath,
  filename: servicePath,
  loaded: true,
  exports: {
    buildTechnologyTicketListForUser: () => ({ components: [] }),
    buildTechnologyTicketStatisticsForGuild: async () => ({ components: [] }),
    changeTechnologyTicketCategory: async ({ category }) => mockTicket({ category }),
    claimTechnologyTicket: async () => ({ outcome: 'claimed', ticket: mockTicket() }),
    createTechnologyTicketFromDescription: async () => ({
      ticket_id: 'TDD20260001',
      guild_id: 'guild',
      thread_id: 'thread',
    }),
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
    releaseTechnologyTicket: async () => ({
      outcome: 'released',
      ticket: mockTicket({ assigned_to_id: null }),
    }),
    reopenTechnologyTicket: async () => {
      if (reopenError) throw reopenError;
      return { outcome: 'reopened' };
    },
  },
};

const button = require('../src/components/button/technologyTickets/technologyTicketButton');
const closeCommand = require('../src/commands/employeeCommands/close_thread');
const closeModal = require('../src/components/modal/technologyTickets/technologyTicketCloseModal');
const urgencyModal = require('../src/components/modal/technologyTickets/technologyTicketUrgencyModal');
const openModal = require('../src/components/modal/technologyTickets/technologyTicketOpenModal');
const categoryMenu = require('../src/components/menu/technologyTickets/technologyTicketCategory');
const interactionEvent = require('../src/events/client/interactionCreate');

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

test('ticket creation immediately shows progress before returning the thread link', async () => {
  const responses = [];
  await openModal.execute(
    {
      fields: { getTextInputValue: () => 'The office printer is offline.' },
      guildId: 'guild',
      user: { id: 'requester' },
      reply: async (payload) => { responses.push(payload); },
      editReply: async (payload) => { responses.push(payload); },
    },
    {}
  );

  assert.match(JSON.stringify(responses[0].components[0].toJSON()), /Creating your ticket/);
  assert.match(JSON.stringify(responses[1].components[0].toJSON()), /Ticket opened/);
});

test('claim updates the clicked ticket card without a message fetch', async () => {
  let update;
  await button.execute(
    {
      customId: 'techTicket:claim:TDD20260001',
      member: { isTechnologyStaff: true },
      user: { id: 'staff' },
      update: async (payload) => { update = payload; },
    },
    {}
  );

  assert.match(JSON.stringify(update.components[0].toJSON()), /\*\*Owner\*\* · <@staff>/);
});

test('category selection updates the clicked ticket card directly', async () => {
  let update;
  await categoryMenu.execute(
    {
      member: { isTechnologyStaff: true },
      values: ['Network & Internet'],
      channelId: 'thread',
      user: { id: 'staff' },
      update: async (payload) => { update = payload; },
    },
    {}
  );

  assert.match(JSON.stringify(update.components[0].toJSON()), /Network & Internet/);
});

test('global interaction errors complete an already deferred response', async () => {
  let reply;
  const originalConsoleError = console.error;
  console.error = () => {};
  try {
    await interactionEvent.respondToInteractionError(
      {
        deferred: true,
        editReply: async (payload) => { reply = payload; },
      },
      new Error('Test failure')
    );
  } finally {
    console.error = originalConsoleError;
  }
  assert.match(JSON.stringify(reply.components[0].toJSON()), /Interaction failed/);
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

test('reopen button completes the deferred reply when thread unlocking fails', async () => {
  let reply;
  reopenError = Object.assign(new Error('Missing Permissions'), { code: 50013 });
  const originalConsoleError = console.error;
  console.error = () => {};
  try {
    await button.execute(
      {
        customId: 'techTicket:reopen:TDD20260001',
        user: { id: 'requester' },
        deferReply: async () => {},
        editReply: async (payload) => { reply = payload; },
      },
      {}
    );
  } finally {
    console.error = originalConsoleError;
    reopenError = null;
  }

  const serialized = JSON.stringify(reply.components[0].toJSON());
  assert.match(serialized, /Ticket could not be reopened/);
  assert.match(serialized, /Manage Threads/);
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
