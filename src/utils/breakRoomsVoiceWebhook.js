const axios = require('axios');
const crypto = require('crypto');

const DEFAULT_BREAK_ROOMS_CATEGORY_ID = '1552121583391215676';
const MAX_DELIVERY_ATTEMPTS = 3;

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

function createSignature(secret, timestamp, rawBody) {
  return `v1=${crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex')}`;
}

function retryAfterMilliseconds(headers) {
  const value = headers?.['retry-after'];
  const seconds = Number(value);
  return Number.isFinite(seconds) ? Math.max(0, Math.ceil(seconds * 1000)) : null;
}

function isRetryable(error) {
  const status = error?.response?.status || error?.status;
  return !status || status === 408 || status === 429 || status >= 500;
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function sendBreakRoomsVoiceWebhook(
  oldState,
  newState,
  {
    httpClient = axios,
    sleep = wait,
    maxAttempts = MAX_DELIVERY_ATTEMPTS,
  } = {},
) {
  const payload = buildBreakRoomsVoicePayload(oldState, newState);
  const webhookUrl = process.env.BREAK_ROOMS_WEBHOOK_URL;
  if (!payload || !webhookUrl) return false;

  const secret = process.env.BREAK_ROOMS_WEBHOOK_SECRET || process.env.DISCORD_ACTIVITY_WEBHOOK_SECRET;
  if (!secret) throw new Error('Break Rooms webhook is configured but no webhook secret is set');

  const eventId = `discord-break-rooms-voice:${crypto.randomUUID()}`;
  const rawBody = JSON.stringify(payload);
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const timestamp = String(Math.floor(Date.now() / 1000));
    try {
      const response = await httpClient.post(webhookUrl, rawBody, {
        headers: {
          'Content-Type': 'application/json',
          'X-Omnilert-Event-Id': eventId,
          'X-Omnilert-Timestamp': timestamp,
          'X-Omnilert-Signature': createSignature(secret, timestamp, rawBody),
        },
        transformRequest: [(body) => body],
        timeout: 15000,
        validateStatus: () => true,
      });
      if ((response.status >= 200 && response.status < 300) || response.status === 409) return true;

      const error = new Error(`Break Rooms webhook returned HTTP ${response.status}`);
      error.status = response.status;
      error.response = response;
      throw error;
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts || !isRetryable(error)) throw error;
      const delay = retryAfterMilliseconds(error.response?.headers) || 1000 * (2 ** (attempt - 1));
      await sleep(delay);
    }
  }

  throw lastError;
}

module.exports = {
  DEFAULT_BREAK_ROOMS_CATEGORY_ID,
  isBreakRoomsVoiceState,
  buildBreakRoomsVoicePayload,
  createSignature,
  sendBreakRoomsVoiceWebhook,
};
