const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function loadOrderConfirmationWithStubs({ updateClosingPcfBalance }) {
  const modulePath = require.resolve('../src/components/button/posSession/orderConfirmation.js');
  const odooRpcPath = require.resolve('../src/odooRpc.js');

  delete require.cache[modulePath];
  require.cache[odooRpcPath] = {
    id: odooRpcPath,
    filename: odooRpcPath,
    loaded: true,
    exports: { updateClosingPcfBalance },
  };

  return require(modulePath);
}

function buildTestClient() {
  const posThread = {
    send: async () => {},
  };
  const posChannel = {
    messages: {
      fetch: async () => [
        {
          content: 'Session ABC',
          thread: posThread,
        },
      ],
    },
  };

  return {
    channels: {
      cache: {
        get(id) {
          if (id === 'pos-1') {
            return posChannel;
          }
          return null;
        },
      },
    },
  };
}

function buildConfirmInteraction({ description, countedFieldName, countedValue }) {
  const followUps = [];
  return {
    followUps,
    user: {
      id: 'user-1',
      toString() {
        return '<@user-1>';
      },
    },
    member: {
      roles: {
        cache: {
          has() {
            return true;
          },
        },
      },
      nickname: 'Tester',
    },
    message: {
      channelId: 'verification-1',
      embeds: [
        {
          data: {
            description,
            fields: [
              { name: 'Session Name', value: 'Session ABC' },
              { name: countedFieldName, value: countedValue },
            ],
            footer: { text: '' },
          },
        },
        {
          data: {
            image: { url: 'https://example.com/proof.jpg' },
          },
        },
      ],
      mentions: {
        users: { first: () => null },
        roles: { first: () => null },
      },
      thread: {
        name: 'PCF Report Proof - 1',
        delete: async () => {},
      },
      delete: async () => {},
    },
    deferUpdate: async () => {},
    followUp: async (payload) => followUps.push(payload),
  };
}

test('orderConfirmation does not save closing PCF when POS routing is deprecated', async () => {
  const rpcCalls = [];
  const orderConfirmation = loadOrderConfirmationWithStubs({
    updateClosingPcfBalance: async (...args) => {
      rpcCalls.push(args);
    },
  });

  const client = buildTestClient();
  const interaction = buildConfirmInteraction({
    description: '## 📝 PCF Report',
    countedFieldName: 'Closing PCF Counted',
    countedValue: '₱1,234.50',
  });

  await orderConfirmation.execute(interaction, client);

  assert.deepEqual(rpcCalls, []);
  assert.match(interaction.followUps[0].content, /Branch POS channel routing is deprecated/);
});

test('orderConfirmation does not save opening PCF when POS routing is deprecated', async () => {
  const rpcCalls = [];
  const orderConfirmation = loadOrderConfirmationWithStubs({
    updateClosingPcfBalance: async (...args) => {
      rpcCalls.push(args);
    },
  });

  const client = buildTestClient();
  const interaction = buildConfirmInteraction({
    description: '## 💰 Opening PCF Breakdown',
    countedFieldName: 'Opening PCF Counted',
    countedValue: '₱243.00',
  });

  await orderConfirmation.execute(interaction, client);

  assert.deepEqual(rpcCalls, []);
  assert.match(interaction.followUps[0].content, /Branch POS channel routing is deprecated/);
});

test('cashBreakdown does not save PCF before confirmation', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'components', 'button', 'posSession', 'cashBreakdown.js'),
    'utf8'
  );

  assert.doesNotMatch(
    source,
    /updateClosingPcfBalance\(total,\s*departmentId,\s*sessionField\.value,\s*'closing'\)/
  );
  assert.doesNotMatch(
    source,
    /updateClosingPcfBalance\(total,\s*departmentId,\s*sessionField\.value,\s*'opening'\)/
  );
});

test('posPcfInput does not save closing PCF before confirmation', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'components', 'button', 'posSession', 'posPcfInput.js'),
    'utf8'
  );

  assert.doesNotMatch(
    source,
    /updateClosingPcfBalance\(countedParsed,\s*departmentId,\s*sessionName,\s*'closing'\)/
  );
});
