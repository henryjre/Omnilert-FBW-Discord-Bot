const express = require('express');
const moment = require('moment-timezone');
const {
  ChannelType,
  ContainerBuilder,
  EmbedBuilder,
  MessageFlags,
} = require('discord.js');

const router = express.Router();

const CRON_NOTIFICATION_CHANNEL_ID = '1487864900947542209';
const ERROR_MENTION_USER_ID = '748568303219245117';
const DEFAULT_TIMEZONE = 'Asia/Manila';
const TIMESTAMP_OUTPUT_FORMAT = 'MMMM DD, YYYY [at] h:mm A';
const CRON_FAILURE_THREAD_AUTO_ARCHIVE_MINUTES = 1440;
const DISCORD_FIELD_VALUE_LIMIT = 1024;
const DISCORD_THREAD_NAME_LIMIT = 100;

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

function truncateDiscordText(value, maxLength = DISCORD_FIELD_VALUE_LIMIT) {
  const text = toDisplay(value);
  if (text.length <= maxLength) return text;

  return `${text.slice(0, Math.max(0, maxLength - 3))}...`;
}

function normalizeFailureDetail(failure) {
  if (!failure || typeof failure !== 'object') {
    return {
      entityType: 'cron_run',
      entityId: null,
      error: toDisplay(failure),
    };
  }

  return {
    entityType: toDisplay(failure.entityType),
    entityId: failure.entityId === undefined ? null : failure.entityId,
    error: toDisplay(failure.error),
  };
}

function parseCronFailureDetails(errorMessage) {
  const raw = typeof errorMessage === 'string' ? errorMessage.trim() : '';
  if (!raw) {
    return {
      failed: 0,
      failures: [],
      parsed: false,
    };
  }

  try {
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === 'object' &&
      Array.isArray(parsed.failures)
    ) {
      const failures = parsed.failures.map(normalizeFailureDetail);
      const failed = Number.isFinite(parsed.failed) ? parsed.failed : failures.length;

      return {
        failed,
        failures,
        parsed: true,
      };
    }
  } catch {
    // Legacy plain-string payloads are handled below.
  }

  return {
    failed: 1,
    failures: [
      {
        entityType: 'cron_run',
        entityId: null,
        error: raw,
      },
    ],
    parsed: false,
  };
}

function getCronFailureDetails(payload) {
  const details = parseCronFailureDetails(payload.result?.error_message);
  if (details.failures.length > 0) return details;

  const fallbackError = toDisplay(payload.result?.message);
  if (fallbackError === 'N/A') return details;

  return {
    failed: 1,
    failures: [
      {
        entityType: 'cron_run',
        entityId: null,
        error: fallbackError,
      },
    ],
    parsed: false,
  };
}

function buildFailureSummary(details) {
  const count = Number.isFinite(details.failed)
    ? details.failed
    : details.failures.length;

  if (count <= 0) return 'N/A';

  return `${count} failure(s); see thread for details`;
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
  const errorMessageDisplay = options.errorMessageDisplay ?? toDisplay(payload.result?.error_message);

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
    `- **Error Message:** ${errorMessageDisplay}`,
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

function buildCronFailureThreadName(payload) {
  const baseName = `Cron Failure | ${toDisplay(payload.job?.name)} | ${toDisplay(payload.run?.id)}`;

  if (baseName.length <= DISCORD_THREAD_NAME_LIMIT) return baseName;

  return baseName.slice(0, DISCORD_THREAD_NAME_LIMIT);
}

function buildCronFailureEmbed(payload, failure, index) {
  const timezone = toDisplay(payload.meta?.timezone) === 'N/A' ? DEFAULT_TIMEZONE : toDisplay(payload.meta?.timezone);

  return new EmbedBuilder()
    .setTitle(`Cron Failure #${index + 1}`)
    .setColor(0xed4245)
    .addFields(
      {
        name: 'Job',
        value: truncateDiscordText(payload.job?.name),
      },
      {
        name: 'Entity Type',
        value: truncateDiscordText(failure.entityType),
        inline: true,
      },
      {
        name: 'Entity ID',
        value: truncateDiscordText(failure.entityId),
        inline: true,
      },
      {
        name: 'Error',
        value: truncateDiscordText(failure.error),
      },
      {
        name: 'Run ID',
        value: truncateDiscordText(payload.run?.id),
      },
      {
        name: 'Started At',
        value: truncateDiscordText(formatTimestamp(payload.run?.started_at, timezone)),
        inline: true,
      },
      {
        name: 'Finished At',
        value: truncateDiscordText(formatTimestamp(payload.run?.finished_at, timezone)),
        inline: true,
      },
    );
}

async function sendCronFailureThread(message, payload, details) {
  if (!message || typeof message.startThread !== 'function') return null;
  if (!details.failures.length) return null;

  const thread = await message.startThread({
    name: buildCronFailureThreadName(payload),
    type: ChannelType.PublicThread,
    autoArchiveDuration: CRON_FAILURE_THREAD_AUTO_ARCHIVE_MINUTES,
  });

  for (let index = 0; index < details.failures.length; index += 1) {
    await thread.send({
      embeds: [buildCronFailureEmbed(payload, details.failures[index], index)],
    });
  }

  return thread;
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
      const failureDetails = isErrorStatus ? getCronFailureDetails(req.body) : null;
      const cronContainer = buildCronNotificationContainer(req.body, {
        mentionUserId: isErrorStatus ? ERROR_MENTION_USER_ID : null,
        errorMessageDisplay: isErrorStatus && failureDetails
          ? buildFailureSummary(failureDetails)
          : undefined,
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

      const sentMessage = await targetChannel.send(messagePayload);

      if (isErrorStatus && failureDetails?.failures.length) {
        try {
          await sendCronFailureThread(sentMessage, req.body, failureDetails);
        } catch (threadError) {
          console.error('Failed to send cron failure thread:', threadError);
        }
      }

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
module.exports.parseCronFailureDetails = parseCronFailureDetails;
module.exports.getCronFailureDetails = getCronFailureDetails;
module.exports.buildFailureSummary = buildFailureSummary;
module.exports.buildCronFailureEmbed = buildCronFailureEmbed;
module.exports.sendCronFailureThread = sendCronFailureThread;
