const axios = require('axios');

const DEFAULT_BREAK_ROOMS_CATEGORY_ID = '1552121583391215676';

function getBreakRoomsCategoryId() {
  return process.env.BREAK_ROOMS_CATEGORY_ID || DEFAULT_BREAK_ROOMS_CATEGORY_ID;
}

function getChannelSummary(channel, channelId) {
  if (!channelId) return null;
  return {
    id: channelId,
    name: channel?.name || null,
  };
}

function isInBreakRooms(channel, channelId) {
  return Boolean(channelId && channel?.parentId === getBreakRoomsCategoryId());
}

function isBreakRoomsVoiceState(state) {
  return isInBreakRooms(state?.channel, state?.channelId);
}

function buildBreakRoomsVoicePayload(oldState, newState) {
  const oldChannelId = oldState?.channelId || null;
  const newChannelId = newState?.channelId || null;
  if (oldChannelId === newChannelId) return null;

  const wasInBreakRooms = isInBreakRooms(oldState?.channel, oldChannelId);
  const isInBreakRoomsNow = isInBreakRooms(newState?.channel, newChannelId);
  if (!wasInBreakRooms && !isInBreakRoomsNow) return null;

  const member = newState?.member || oldState?.member;
  const user = member?.user;
  if (user?.bot) return null;

  const event = !wasInBreakRooms && isInBreakRoomsNow
    ? oldChannelId ? 'moved_to' : 'joined'
    : wasInBreakRooms && !isInBreakRoomsNow
      ? newChannelId ? 'moved_from' : 'left'
      : 'moved';

  return {
    event,
    occurred_at: new Date().toISOString(),
    user: {
      id: user?.id || member?.id || newState?.id || oldState?.id || null,
      username: user?.username || null,
      display_name: member?.displayName || user?.globalName || user?.username || null,
    },
    from_channel: getChannelSummary(oldState?.channel, oldChannelId),
    to_channel: getChannelSummary(newState?.channel, newChannelId),
  };
}

async function sendBreakRoomsVoiceWebhook(oldState, newState, { httpClient = axios } = {}) {
  const payload = buildBreakRoomsVoicePayload(oldState, newState);
  const webhookUrl = process.env.BREAK_ROOMS_WEBHOOK_URL;
  if (!payload || !webhookUrl) return false;

  await httpClient.post(webhookUrl, payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 15000,
  });
  return true;
}

module.exports = {
  DEFAULT_BREAK_ROOMS_CATEGORY_ID,
  isBreakRoomsVoiceState,
  buildBreakRoomsVoicePayload,
  sendBreakRoomsVoiceWebhook,
};
