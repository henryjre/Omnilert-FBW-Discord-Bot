const test = require('node:test');
const assert = require('node:assert/strict');

const {
  DEFAULT_BREAK_ROOMS_CATEGORY_ID,
  isBreakRoomsVoiceState,
  buildBreakRoomsVoicePayload,
  sendBreakRoomsVoiceWebhook,
} = require('../src/utils/breakRoomsVoiceWebhook');

function makeState(channel = null) {
  return {
    id: 'user-1',
    channelId: channel?.id || null,
    channel,
    member: {
      id: 'user-1',
      displayName: 'Jane Doe',
      user: { id: 'user-1', username: 'jane', bot: false },
    },
  };
}

function makeChannel(id, name, parentId = DEFAULT_BREAK_ROOMS_CATEGORY_ID) {
  return { id, name, parentId };
}

test('Break Rooms voice payloads distinguish joins, moves, and leaves', () => {
  const roomOne = makeChannel('room-1', 'Breakout One');
  const roomTwo = makeChannel('room-2', 'Breakout Two');

  const joined = buildBreakRoomsVoicePayload(makeState(), makeState(roomOne));
  assert.equal(joined.event, 'joined');
  assert.equal(joined.from_channel, null);
  assert.deepEqual(joined.to_channel, { id: 'room-1', name: 'Breakout One' });

  const moved = buildBreakRoomsVoicePayload(makeState(roomOne), makeState(roomTwo));
  assert.equal(moved.event, 'moved');
  assert.deepEqual(moved.from_channel, { id: 'room-1', name: 'Breakout One' });
  assert.deepEqual(moved.to_channel, { id: 'room-2', name: 'Breakout Two' });

  const left = buildBreakRoomsVoicePayload(makeState(roomTwo), makeState());
  assert.equal(left.event, 'left');
  assert.deepEqual(left.from_channel, { id: 'room-2', name: 'Breakout Two' });
  assert.equal(left.to_channel, null);
});

test('Break Rooms voice payloads distinguish moves into and out of the category', () => {
  const lobby = makeChannel('lobby-1', 'Lobby', 'another-category');
  const room = makeChannel('room-1', 'Breakout One');

  const movedTo = buildBreakRoomsVoicePayload(makeState(lobby), makeState(room));
  assert.equal(movedTo.event, 'moved_to');
  assert.deepEqual(movedTo.from_channel, { id: 'lobby-1', name: 'Lobby' });
  assert.deepEqual(movedTo.to_channel, { id: 'room-1', name: 'Breakout One' });

  const movedFrom = buildBreakRoomsVoicePayload(makeState(room), makeState(lobby));
  assert.equal(movedFrom.event, 'moved_from');
  assert.deepEqual(movedFrom.from_channel, { id: 'room-1', name: 'Breakout One' });
  assert.deepEqual(movedFrom.to_channel, { id: 'lobby-1', name: 'Lobby' });
});

test('Break Rooms webhook ignores other categories and posts the compact payload', async () => {
  const outsideRoom = makeChannel('outside-1', 'Lobby', 'another-category');
  assert.equal(isBreakRoomsVoiceState(makeState(outsideRoom)), false);
  assert.equal(isBreakRoomsVoiceState(makeState(makeChannel('room-1', 'Breakout One'))), true);
  assert.equal(buildBreakRoomsVoicePayload(makeState(), makeState(outsideRoom)), null);

  const previousUrl = process.env.BREAK_ROOMS_WEBHOOK_URL;
  process.env.BREAK_ROOMS_WEBHOOK_URL = 'https://example.test/break-rooms';
  const requests = [];
  const delivered = await sendBreakRoomsVoiceWebhook(makeState(), makeState(makeChannel('room-1', 'Breakout One')), {
    httpClient: {
      post: async (url, payload, options) => {
        requests.push({ url, payload, options });
      },
    },
  });
  if (previousUrl === undefined) delete process.env.BREAK_ROOMS_WEBHOOK_URL;
  else process.env.BREAK_ROOMS_WEBHOOK_URL = previousUrl;

  assert.equal(delivered, true);
  assert.equal(requests[0].url, 'https://example.test/break-rooms');
  assert.equal(requests[0].payload.event, 'joined');
  assert.deepEqual(requests[0].options.headers, { 'Content-Type': 'application/json' });
});
