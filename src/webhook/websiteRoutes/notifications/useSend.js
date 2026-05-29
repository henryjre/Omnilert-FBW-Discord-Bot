const express = require('express');
const {
  ContainerBuilder,
  MessageFlags,
} = require('discord.js');

const router = express.Router();

const USE_SEND_LOG_CHANNEL_ID = '1509933047074525265';
const DISCORD_TEXT_DISPLAY_LIMIT = 4000;
const JSON_CHUNK_SIZE = 3400;

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function toDisplay(value) {
  if (value === null || value === undefined) return 'N/A';

  const stringValue = String(value).trim();
  return stringValue.length === 0 ? 'N/A' : stringValue;
}

function truncateText(value, maxLength = DISCORD_TEXT_DISPLAY_LIMIT) {
  const text = toDisplay(value);
  if (text.length <= maxLength) return text;

  return `${text.slice(0, Math.max(0, maxLength - 3))}...`;
}

function isValidUseSendPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return false;
  if (!isNonEmptyString(payload.id)) return false;
  if (!isNonEmptyString(payload.type)) return false;
  if (!isNonEmptyString(payload.version)) return false;
  if (!isNonEmptyString(payload.createdAt)) return false;
  if (!Number.isInteger(payload.teamId)) return false;
  if (!payload.data || typeof payload.data !== 'object' || Array.isArray(payload.data)) return false;
  if (!Number.isInteger(payload.attempt)) return false;

  return true;
}

function splitText(text, chunkSize = JSON_CHUNK_SIZE) {
  const chunks = [];

  for (let index = 0; index < text.length; index += chunkSize) {
    chunks.push(text.slice(index, index + chunkSize));
  }

  return chunks.length ? chunks : [''];
}

function buildUseSendWebhookContainer(payload) {
  const summaryBlock = [
    '## useSend Webhook',
    `**Type:** \`${toDisplay(payload.type)}\``,
    `**ID:** \`${toDisplay(payload.id)}\``,
    `**Version:** \`${toDisplay(payload.version)}\``,
    `**Created At:** \`${toDisplay(payload.createdAt)}\``,
    `**Team ID:** \`${toDisplay(payload.teamId)}\``,
    `**Attempt:** \`${toDisplay(payload.attempt)}\``,
  ].join('\n');

  const dataBlock = [
    '### Data',
    `- **Test:** ${toDisplay(payload.data?.test)}`,
    `- **Webhook ID:** ${toDisplay(payload.data?.webhookId)}`,
    `- **Sent At:** ${toDisplay(payload.data?.sentAt)}`,
  ].join('\n');

  const formattedPayload = JSON.stringify(payload, null, 2);
  const payloadChunks = splitText(formattedPayload);
  const container = new ContainerBuilder()
    .setAccentColor(payload.data?.test ? 0x5865f2 : 0x57f287)
    .addTextDisplayComponents((textDisplay) => textDisplay.setContent(summaryBlock))
    .addSeparatorComponents((separator) => separator)
    .addTextDisplayComponents((textDisplay) => textDisplay.setContent(dataBlock))
    .addSeparatorComponents((separator) => separator);

  payloadChunks.forEach((chunk, index) => {
    const title = payloadChunks.length > 1
      ? `### Payload (${index + 1}/${payloadChunks.length})`
      : '### Payload';

    container.addTextDisplayComponents((textDisplay) => (
      textDisplay.setContent(truncateText(`${title}\n\`\`\`json\n${chunk}\n\`\`\``))
    ));
  });

  return container;
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

function createUseSendWebhookHandler({
  clientInstance,
  channelId = USE_SEND_LOG_CHANNEL_ID,
} = {}) {
  return async (req, res) => {
    try {
      if (!isValidUseSendPayload(req.body)) {
        return res.status(400).json({ ok: false, message: 'Invalid payload' });
      }

      const resolvedClient = clientInstance || require('../../../index.js');
      const targetChannel = await resolveChannel(resolvedClient, channelId);
      const container = buildUseSendWebhookContainer(req.body);

      await targetChannel.send({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });

      return res.status(200).json({ ok: true, message: 'useSend webhook logged' });
    } catch (error) {
      console.error('useSend webhook error:', error);
      return res.status(500).json({ ok: false, message: 'Failed to log useSend webhook' });
    }
  };
}

router.post('/usesend', createUseSendWebhookHandler());

module.exports = router;
module.exports.USE_SEND_LOG_CHANNEL_ID = USE_SEND_LOG_CHANNEL_ID;
module.exports.buildUseSendWebhookContainer = buildUseSendWebhookContainer;
module.exports.createUseSendWebhookHandler = createUseSendWebhookHandler;
module.exports.isValidUseSendPayload = isValidUseSendPayload;
