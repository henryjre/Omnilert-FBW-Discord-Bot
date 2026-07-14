const express = require('express');

const { extractBearerToken } = require('../notifications/cronNotifications');

const router = express.Router();
const VALID_DELETE_REASONS = new Set(['cancelled', 'completed']);

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isUnknownChannelError(error) {
  return error?.code === 10003 || error?.rawError?.code === 10003 || error?.status === 404;
}

function isValidMeetingDeleteChannelPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return false;
  if (payload.event !== 'meeting.delete_channel') return false;
  if (typeof payload.version !== 'number') return false;
  if (!payload.meeting || typeof payload.meeting !== 'object') return false;
  if (!isNonEmptyString(payload.meeting.id)) return false;
  if (!isNonEmptyString(payload.voice_channel_id)) return false;
  if (!VALID_DELETE_REASONS.has(payload.reason)) return false;

  return true;
}

async function resolveDiscordChannel(clientInstance, channelId) {
  let channel = clientInstance.channels?.cache?.get?.(channelId);

  if (!channel && typeof clientInstance.channels?.fetch === 'function') {
    try {
      channel = await clientInstance.channels.fetch(channelId);
    } catch (error) {
      if (isUnknownChannelError(error)) return null;
      throw error;
    }
  }

  return channel || null;
}

async function deleteMeetingVoiceChannel({ clientInstance, payload }) {
  const channel = await resolveDiscordChannel(clientInstance, payload.voice_channel_id);

  if (!channel) {
    return { deleted: false, reason: 'not-found' };
  }

  if (typeof channel.delete !== 'function') {
    throw new Error(`Discord channel ${payload.voice_channel_id} cannot be deleted`);
  }

  try {
    await channel.delete(`Meeting ${payload.meeting.id} ${payload.reason} from webhook`);
  } catch (error) {
    if (isUnknownChannelError(error)) return { deleted: false, reason: 'not-found' };
    throw error;
  }

  return { deleted: true };
}

function createMeetingDeleteChannelHandler({
  clientInstance,
  expectedToken = process.env.prodToken,
} = {}) {
  return async (req, res) => {
    try {
      const authHeader = req.get ? req.get('authorization') : req.headers?.authorization;
      const providedToken = extractBearerToken(authHeader);

      if (!providedToken || !expectedToken || providedToken !== expectedToken) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      if (!isValidMeetingDeleteChannelPayload(req.body)) {
        return res.status(400).json({ success: false, message: 'Invalid payload' });
      }

      const resolvedClient = clientInstance || require('../../../index.js');
      const result = await deleteMeetingVoiceChannel({
        clientInstance: resolvedClient,
        payload: req.body,
      });

      return res.status(200).json({
        success: true,
        voice_channel_id: req.body.voice_channel_id,
        deleted: result.deleted,
        ...(result.reason ? { reason: result.reason } : {}),
      });
    } catch (error) {
      console.error('Meeting delete channel webhook error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete meeting voice channel',
      });
    }
  };
}

module.exports = router;
module.exports.VALID_DELETE_REASONS = VALID_DELETE_REASONS;
module.exports.createMeetingDeleteChannelHandler = createMeetingDeleteChannelHandler;
module.exports.deleteMeetingVoiceChannel = deleteMeetingVoiceChannel;
module.exports.isValidMeetingDeleteChannelPayload = isValidMeetingDeleteChannelPayload;
module.exports.resolveDiscordChannel = resolveDiscordChannel;
