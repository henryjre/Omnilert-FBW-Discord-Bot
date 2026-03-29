const express = require('express');
const moment = require('moment-timezone');
const { ContainerBuilder, MessageFlags } = require('discord.js');

const router = express.Router();

const CRON_NOTIFICATION_CHANNEL_ID = '1487864900947542209';
const ERROR_MENTION_USER_ID = '748568303219245117';
const DEFAULT_TIMEZONE = 'Asia/Manila';
const TIMESTAMP_OUTPUT_FORMAT = 'MMMM DD, YYYY [at] h:mm A';

function extractBearerToken(authorizationHeader) {
  if (typeof authorizationHeader !== 'string') return null;

  const match = authorizationHeader.match(/^Bearer\s+(.+)$/);
  if (!match) return null;

  const token = match[1].trim();
  if (!token || token.includes(' ')) return null;

  return token;
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidCronPayload(payload) {
  if (!payload || typeof payload !== 'object') return false;
  if (!isNonEmptyString(payload.event)) return false;
  if (typeof payload.version !== 'number') return false;
  if (!isNonEmptyString(payload.environment)) return false;
  if (!isNonEmptyString(payload.sent_at)) return false;
  if (!payload.job || typeof payload.job !== 'object') return false;
  if (!isNonEmptyString(payload.job.name)) return false;
  if (!payload.run || typeof payload.run !== 'object') return false;
  if (!isNonEmptyString(payload.run.id)) return false;
  if (!payload.result || typeof payload.result !== 'object') return false;
  if (!isNonEmptyString(payload.result.status)) return false;

  return true;
}

function toDisplay(value) {
  if (value === null || value === undefined) return 'N/A';

  const stringValue = String(value).trim();
  return stringValue.length === 0 ? 'N/A' : stringValue;
}

function formatTimestamp(value, timezone = DEFAULT_TIMEZONE) {
  const rawValue = toDisplay(value);
  if (rawValue === 'N/A') return rawValue;

  let parsed = null;

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(rawValue)) {
    parsed = moment.tz(rawValue, 'YYYY-MM-DD HH:mm:ss', true, timezone);
  } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(rawValue)) {
    parsed = moment.tz(rawValue, 'YYYY-MM-DDTHH:mm', true, timezone);
  } else {
    parsed = moment(rawValue);
  }

  if (!parsed.isValid()) {
    return rawValue;
  }

  return parsed.tz(timezone).format(TIMESTAMP_OUTPUT_FORMAT);
}

function buildCronNotificationContainer(payload, options = {}) {
  const isErrorStatus = toDisplay(payload.result?.status).toLowerCase() !== 'success';
  const accentColor = isErrorStatus ? 0xed4245 : 0x57f287;
  const timezone = toDisplay(payload.meta?.timezone) === 'N/A' ? DEFAULT_TIMEZONE : toDisplay(payload.meta?.timezone);
  const mentionUserId = options.mentionUserId || null;
  const mentionBlock = mentionUserId ? `## <@${mentionUserId}>` : null;

  const headerBlock = [
    '## Cron Job Notification',
    `**Event:** \`${toDisplay(payload.event)}\``,
    `**Status:** \`${toDisplay(payload.result?.status)}\``,
    `**Environment:** \`${toDisplay(payload.environment)}\``,
    `**Sent At:** \`${formatTimestamp(payload.sent_at, timezone)}\``,
  ].join('\n');

  const jobBlock = [
    '### Job',
    `- **Name:** ${toDisplay(payload.job?.name)}`,
    `- **Family:** ${toDisplay(payload.job?.family)}`,
    `- **Schedule:** ${toDisplay(payload.job?.schedule)}`,
    `- **Trigger:** ${toDisplay(payload.job?.trigger)}`,
  ].join('\n');

  const runBlock = [
    '### Run',
    `- **ID:** ${toDisplay(payload.run?.id)}`,
    `- **Scheduled Key:** ${formatTimestamp(payload.run?.scheduled_for_key, timezone)}`,
    `- **Scheduled Manila:** ${formatTimestamp(payload.run?.scheduled_for_manila, timezone)}`,
    `- **Source:** ${toDisplay(payload.run?.source)}`,
    `- **Started At:** ${formatTimestamp(payload.run?.started_at, timezone)}`,
    `- **Finished At:** ${formatTimestamp(payload.run?.finished_at, timezone)}`,
    `- **Duration (ms):** ${toDisplay(payload.run?.duration_ms)}`,
    `- **Attempt:** ${toDisplay(payload.run?.attempt)}`,
  ].join('\n');

  const resultBlock = [
    '### Result',
    `- **Status:** ${toDisplay(payload.result?.status)}`,
    `- **Message:** ${toDisplay(payload.result?.message)}`,
    `- **Error Message:** ${toDisplay(payload.result?.error_message)}`,
  ].join('\n');

  const statsMetaBlock = [
    '### Stats & Meta',
    `- **Processed:** ${toDisplay(payload.stats?.processed)}`,
    `- **Succeeded:** ${toDisplay(payload.stats?.succeeded)}`,
    `- **Failed:** ${toDisplay(payload.stats?.failed)}`,
    `- **Skipped:** ${toDisplay(payload.stats?.skipped)}`,
    `- **Timezone:** ${toDisplay(payload.meta?.timezone)}`,
  ].join('\n');

  const container = new ContainerBuilder().setAccentColor(accentColor);

  if (mentionBlock) {
    container
      .addTextDisplayComponents((textDisplay) => textDisplay.setContent(mentionBlock))
      .addSeparatorComponents((separator) => separator);
  }

  return container
    .addTextDisplayComponents((textDisplay) => textDisplay.setContent(headerBlock))
    .addSeparatorComponents((separator) => separator)
    .addTextDisplayComponents((textDisplay) => textDisplay.setContent(jobBlock))
    .addSeparatorComponents((separator) => separator)
    .addTextDisplayComponents((textDisplay) => textDisplay.setContent(runBlock))
    .addSeparatorComponents((separator) => separator)
    .addTextDisplayComponents((textDisplay) => textDisplay.setContent(resultBlock))
    .addSeparatorComponents((separator) => separator)
    .addTextDisplayComponents((textDisplay) => textDisplay.setContent(statsMetaBlock));
}

async function resolveChannel(clientInstance, channelId) {
  let channel = clientInstance.channels?.cache?.get?.(channelId);

  if (!channel && typeof clientInstance.channels?.fetch === 'function') {
    channel = await clientInstance.channels.fetch(channelId);
  }

  if (!channel || typeof channel.send !== 'function') {
    throw new Error(`Discord channel ${channelId} not found or not sendable`);
  }

  return channel;
}

function createCronNotificationHandler({
  clientInstance,
  expectedToken = process.env.prodToken,
  channelId = CRON_NOTIFICATION_CHANNEL_ID,
} = {}) {
  return async (req, res) => {
    try {
      const authHeader = req.get ? req.get('authorization') : req.headers?.authorization;
      const providedToken = extractBearerToken(authHeader);

      if (!providedToken || !expectedToken || providedToken !== expectedToken) {
        return res.status(401).json({ ok: false, message: 'Unauthorized' });
      }

      if (!isValidCronPayload(req.body)) {
        return res.status(400).json({ ok: false, message: 'Invalid payload' });
      }

      const resolvedClient = clientInstance || require('../../../index.js');
      const targetChannel = await resolveChannel(resolvedClient, channelId);

      const isErrorStatus = toDisplay(req.body.result?.status).toLowerCase() !== 'success';
      const cronContainer = buildCronNotificationContainer(req.body, {
        mentionUserId: isErrorStatus ? ERROR_MENTION_USER_ID : null,
      });

      const messagePayload = {
        components: [cronContainer],
        flags: MessageFlags.IsComponentsV2,
      };

      if (isErrorStatus) {
        messagePayload.allowedMentions = {
          users: [ERROR_MENTION_USER_ID],
          parse: [],
        };
      }

      await targetChannel.send(messagePayload);

      return res.status(200).json({ ok: true, message: 'Cron notification sent' });
    } catch (error) {
      console.error('Cron notification webhook error:', error);
      return res.status(500).json({ ok: false, message: 'Failed to send cron notification' });
    }
  };
}

router.post('/cron', createCronNotificationHandler());

module.exports = router;
module.exports.createCronNotificationHandler = createCronNotificationHandler;
module.exports.extractBearerToken = extractBearerToken;
module.exports.isValidCronPayload = isValidCronPayload;
module.exports.buildCronNotificationContainer = buildCronNotificationContainer;
