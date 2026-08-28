const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ChannelType } = require('discord.js');

test('upserts the panel and completes open, close, and reopen lifecycle', async () => {
  const projectRoot = path.resolve(__dirname, '..');
  const originalCwd = process.cwd();
  const previousEnvironment = process.env.node_env;
  const previousTestGuildId = process.env.testGuildId;
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'technology-ticket-service-'));
  fs.mkdirSync(path.join(temporaryRoot, 'src'));
  process.chdir(temporaryRoot);
  process.env.node_env = 'test';
  process.env.testGuildId = 'guild';

  const connectionPath = path.join(projectRoot, 'src', 'sqliteConnection.js');
  const storePath = path.join(projectRoot, 'src', 'utils', 'technologyTicketStore.js');
  const aiPath = path.join(projectRoot, 'src', 'utils', 'technologyTicketAi.js');
  const uiPath = path.join(projectRoot, 'src', 'utils', 'technologyTicketUi.js');
  const servicePath = path.join(projectRoot, 'src', 'utils', 'technologyTicketService.js');
  for (const modulePath of [connectionPath, storePath, aiPath, uiPath, servicePath]) {
    delete require.cache[require.resolve(modulePath)];
  }
  require.cache[aiPath] = {
    id: aiPath,
    filename: aiPath,
    loaded: true,
    exports: {
      TECHNOLOGY_TICKET_CATEGORIES: [
        'Account & Access', 'Hardware', 'Software & Applications', 'Network & Internet',
        'Point of Sale', 'Omnilert Portal', 'Email & Communication', 'Security', 'Other',
      ],
      classifyTechnologyTicket: async () => ({ title: 'Office Printer Offline', category: 'Hardware' }),
    },
  };

  const edits = [];
  const threadMessages = [];
  let panelMessage = null;
  let initialMessage = null;
  const thread = {
    id: 'thread-1',
    messages: {
      fetch: async (messageId) => (messageId === initialMessage?.id ? initialMessage : null),
    },
    members: { add: async (userId) => assert.equal(userId, 'requester') },
    send: async (payload) => {
      threadMessages.push(payload);
      if (!initialMessage) {
        initialMessage = { id: 'initial-1', edit: async (nextPayload) => edits.push(nextPayload) };
        return initialMessage;
      }
      return { id: `thread-message-${threadMessages.length}` };
    },
    setName: async (name) => { thread.name = name; },
    setLocked: async (locked) => { thread.locked = locked; },
    setArchived: async (archived) => { thread.archived = archived; },
    edit: async ({ archived, locked }) => {
      thread.archived = archived;
      thread.locked = locked;
      return thread;
    },
  };
  const channelMap = new Map();
  const parentChannel = {
    id: '1542875926600097892',
    type: ChannelType.GuildText,
    isTextBased: () => true,
    messages: { fetch: async (id) => (id === panelMessage?.id ? panelMessage : null) },
    send: async () => {
      panelMessage = { id: 'panel-1', edit: async (payload) => edits.push(payload) };
      return panelMessage;
    },
    threads: {
      create: async (options) => {
        thread.name = options.name;
        channelMap.set(thread.id, thread);
        return thread;
      },
    },
  };
  channelMap.set(parentChannel.id, parentChannel);
  const client = {
    channels: {
      cache: channelMap,
      fetch: async (id) => channelMap.get(id) || null,
    },
  };

  const service = require(servicePath);
  const db = require(connectionPath);
  try {
    await service.ensureTechnologyTicketPanel(client);
    await service.ensureTechnologyTicketPanel(client);
    assert.equal(panelMessage.id, 'panel-1');
    assert.ok(edits.length >= 1);

    const ticket = await service.createTechnologyTicketFromDescription({
      interaction: {
        guildId: 'guild',
        user: { id: 'requester', tag: 'requester#0001' },
      },
      client,
      description: 'The office printer is offline.',
    });
    assert.equal(ticket.status, 'OPEN');
    assert.equal(ticket.category, 'Hardware');
    assert.match(thread.name, /^ᴏᴘᴇɴ \|/);
    assert.deepEqual(
      await service.refreshActiveTechnologyTicketMessages(client),
      { refreshed: 1, total: 1 }
    );

    const urgent = await service.markTechnologyTicketUrgent({
      client,
      ticketId: ticket.ticket_id,
      requesterId: 'requester',
      reason: 'Store checkout is blocked during operating hours.',
    });
    assert.equal(urgent.outcome, 'marked');
    assert.equal(urgent.ticket.is_urgent, 1);
    assert.match(JSON.stringify(threadMessages.at(-1).components[0].toJSON()), /Urgent ticket escalation/);

    const closed = await service.closeTechnologyTicket({
      client,
      thread,
      actorId: 'staff',
      resolution: 'Restarted the printer.',
    });
    assert.equal(closed.outcome, 'closed');
    assert.equal(thread.locked, true);
    assert.equal(thread.archived, true);
    assert.match(thread.name, /^ᴄʟᴏꜱᴇᴅ \|/);

    const reopened = await service.reopenTechnologyTicket({
      client,
      ticketId: ticket.ticket_id,
      actorId: 'requester',
    });
    assert.equal(reopened.outcome, 'reopened');
    assert.equal(thread.locked, false);
    assert.equal(thread.archived, false);
    assert.match(thread.name, /^ʀᴇᴏᴘᴇɴᴇᴅ \|/);
    assert.ok(threadMessages.length >= 3);
  } finally {
    db.close();
    process.chdir(originalCwd);
    process.env.node_env = previousEnvironment;
    process.env.testGuildId = previousTestGuildId;
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});
