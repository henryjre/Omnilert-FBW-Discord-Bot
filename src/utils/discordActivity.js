const crypto = require('crypto');
const {
  ApplicationCommandOptionType,
  AuditLogEvent,
  ChannelType,
} = require('discord.js');
const store = require('./discordActivityStore');

const SOURCE = 'discord';

function isActivityLogEnabled() {
  return String(process.env.DISCORD_ACTIVITY_LOG_ENABLED || '').toLowerCase() === 'true';
}

function getConfiguredGuildId() {
  return process.env.node_env === 'prod' ? process.env.prodGuildId : process.env.testGuildId;
}

function isConfiguredGuild(guildId) {
  return Boolean(isActivityLogEnabled() && guildId && guildId === getConfiguredGuildId());
}

function validateActivityConfiguration() {
  if (!isActivityLogEnabled()) return;
  const missing = [
    'DISCORD_ACTIVITY_WEBHOOK_URL',
    'DISCORD_ACTIVITY_WEBHOOK_SECRET',
  ].filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Discord activity logging is enabled but missing: ${missing.join(', ')}`);
  }
  if (!getConfiguredGuildId()) {
    throw new Error('Discord activity logging is enabled but the configured guild ID is missing');
  }
}

function nowIso() {
  return new Date().toISOString();
}

function makeEventId(prefix, stablePart = null) {
  return stablePart ? `${prefix}:${stablePart}` : `${prefix}:${crypto.randomUUID()}`;
}

function channelTypeName(type, channel = null) {
  if (channel?.isThread?.()) return channel.parent?.type === ChannelType.GuildForum ? 'forum_post' : 'thread';
  switch (type) {
    case ChannelType.GuildVoice:
    case ChannelType.GuildStageVoice:
      return 'voice';
    case ChannelType.GuildCategory:
      return 'category';
    case ChannelType.PublicThread:
    case ChannelType.PrivateThread:
    case ChannelType.AnnouncementThread:
      return 'thread';
    case ChannelType.GuildForum:
    case ChannelType.GuildMedia:
      return 'forum';
    default:
      return 'text';
  }
}

function channelContext(channel, overrides = {}) {
  return {
    channel_id: channel?.id || overrides.channel_id || null,
    channel_name: channel?.name || overrides.channel_name || null,
    channel_type: channelTypeName(channel?.type ?? overrides.channel_type, channel),
    parent_channel_id: channel?.parentId || overrides.parent_channel_id || null,
    parent_channel_name: channel?.parent?.name || overrides.parent_channel_name || null,
    ...overrides,
  };
}

function userIdentity(user, fallbackId = null) {
  const account = user?.user || user;
  const discordUserId = account?.id || user?.id || fallbackId || null;
  const username = account?.username || null;
  return {
    discord_user_id: discordUserId,
    username,
    display_name: user?.displayName || account?.globalName || username || null,
  };
}

function makeLogPayload(type, actor, subject, context, content) {
  return {
    event_type: type,
    actor,
    subject,
    location: {
      channel_id: context.channel_id,
      channel_name: context.channel_name,
      channel_type: context.channel_type,
      parent_channel_id: context.parent_channel_id,
      parent_channel_name: context.parent_channel_name,
      message_url: context.message_url || null,
    },
    details: content,
  };
}

function makeEnvelope({
  id,
  type,
  occurredAt,
  guildId,
  actorId = null,
  actor = null,
  subject = {},
  context = {},
  content = {},
}) {
  const normalizedActor = userIdentity(actor, actorId);
  const normalizedContext = {
    channel_id: null,
    channel_name: null,
    channel_type: null,
    parent_channel_id: null,
    parent_channel_name: null,
    ...context,
  };
  return {
    id,
    schema_version: 1,
    type,
    source: SOURCE,
    occurred_at: occurredAt || nowIso(),
    observed_at: nowIso(),
    guild_id: guildId,
    actor: normalizedActor,
    subject,
    context: normalizedContext,
    content,
    log: makeLogPayload(type, normalizedActor, subject, normalizedContext, content),
  };
}

function scheduleEvent(eventId) {
  if (!isActivityLogEnabled()) return Promise.resolve(false);
  try {
    const { enqueueDiscordActivity } = require('../queue/discordActivityQueue');
    return enqueueDiscordActivity(eventId).then(() => true).catch((error) => {
      console.error(`Failed to enqueue Discord activity ${eventId}:`, error.message);
      return false;
    });
  } catch (error) {
    console.error(`Failed to load Discord activity queue for ${eventId}:`, error.message);
    return Promise.resolve(false);
  }
}

function persistAndSchedule(activity, state = 'pending') {
  if (!isConfiguredGuild(activity.guild_id)) return { inserted: false, ignored: true };
  const result = store.insertActivity(activity, state);
  if (result.inserted && state === 'pending') void scheduleEvent(activity.id);
  return result;
}

function safelyCapture(label, task) {
  try {
    const result = task();
    if (result && typeof result.then === 'function') {
      result.catch((error) => console.error(`Discord activity capture failed (${label}):`, error.message));
    }
    return result;
  } catch (error) {
    console.error(`Discord activity capture failed (${label}):`, error.message);
    return null;
  }
}

function normalizeAttachments(attachments) {
  if (!attachments) return [];
  const values = typeof attachments.values === 'function' ? [...attachments.values()] : [];
  return values.map((attachment) => ({
    id: attachment.id || null,
    filename: attachment.name || attachment.filename || null,
    content_type: attachment.contentType || attachment.content_type || null,
    size: Number.isFinite(attachment.size) ? attachment.size : null,
    url: attachment.url || null,
  }));
}

function normalizeMessageSnapshot(message) {
  const guildId = message.guildId || message.guild?.id;
  const channel = message.channel;
  const channelId = message.channelId || channel?.id;
  return {
    message_id: message.id,
    guild_id: guildId,
    channel_id: channelId,
    author_id: message.author?.id || null,
    content: message.content ?? null,
    reference: message.reference ? {
      message_id: message.reference.messageId || null,
      channel_id: message.reference.channelId || null,
      guild_id: message.reference.guildId || guildId || null,
    } : null,
    attachments: normalizeAttachments(message.attachments),
    created_at: message.createdAt?.toISOString?.() || (message.createdTimestamp
      ? new Date(message.createdTimestamp).toISOString()
      : nowIso()),
    edited_at: message.editedAt?.toISOString?.() || (message.editedTimestamp
      ? new Date(message.editedTimestamp).toISOString()
      : null),
    observed_at: nowIso(),
    context: channelContext(channel, {
      channel_id: channelId,
      message_url: guildId && channelId ? `https://discord.com/channels/${guildId}/${channelId}/${message.id}` : null,
    }),
  };
}

function isIgnoredMessage(message) {
  return Boolean(!message?.guildId || message.author?.bot || message.webhookId);
}

function captureMessageCreated(message) {
  if (!isConfiguredGuild(message?.guildId) || isIgnoredMessage(message)) return null;
  const snapshot = normalizeMessageSnapshot(message);
  const saved = store.saveMessageSnapshot(snapshot);
  const activity = makeEnvelope({
    id: makeEventId('discord-message-created', message.id),
    type: 'discord.message.created',
    occurredAt: snapshot.created_at,
    guildId: snapshot.guild_id,
    actorId: snapshot.author_id,
    actor: message.member || message.author,
    subject: { message_id: message.id },
    context: snapshot.context,
    content: { message: saved.after },
  });
  persistAndSchedule(activity);
  return activity;
}

async function captureMessageEdited(oldMessage, newMessage) {
  const guildId = newMessage?.guildId || oldMessage?.guildId;
  if (!isConfiguredGuild(guildId)) return null;
  let current = newMessage;
  if (current?.partial) current = await current.fetch().catch(() => current);
  if (isIgnoredMessage(current)) return null;

  const fallbackBefore = oldMessage && !oldMessage.partial && !isIgnoredMessage(oldMessage)
    ? normalizeMessageSnapshot(oldMessage)
    : null;
  const saved = store.saveMessageSnapshot(normalizeMessageSnapshot(current));
  const before = saved.before || fallbackBefore;
  const activity = makeEnvelope({
    id: makeEventId('discord-message-edited', `${current.id}:${saved.after.revision}`),
    type: 'discord.message.edited',
    occurredAt: saved.after.edited_at || saved.after.observed_at,
    guildId,
    actorId: saved.after.author_id,
    actor: current.member || current.author,
    subject: { message_id: current.id },
    context: saved.after.context,
    content: { before, after: saved.after, before_available: Boolean(before) },
  });
  persistAndSchedule(activity);
  return activity;
}

function captureMessageDeleted(message) {
  const guildId = message?.guildId || message?.guild?.id;
  if (!isConfiguredGuild(guildId) || message?.author?.bot || message?.webhookId) return null;
  const channelId = message.channelId || message.channel?.id;
  const result = store.captureMessageDeletion(message.id, (snapshot) => makeEnvelope({
    id: makeEventId('discord-message-deleted', message.id),
    type: 'discord.message.deleted',
    guildId,
    actorId: null,
    subject: { message_id: message.id, author_discord_user_id: snapshot?.author_id || null },
    context: snapshot?.context || channelContext(message.channel, { channel_id: channelId }),
    content: { before: snapshot, content_available: Boolean(snapshot) },
  }));
  if (result.inserted) void scheduleEvent(result.eventId);
  return result;
}

function normalizeEmoji(emoji) {
  return {
    id: emoji?.id || null,
    name: emoji?.name || null,
    animated: Boolean(emoji?.animated),
  };
}

function captureReaction(type, reaction, user = null) {
  const message = reaction?.message;
  const guildId = message?.guildId || message?.guild?.id;
  if (!isConfiguredGuild(guildId) || user?.bot || message?.author?.bot || message?.webhookId) return null;
  const activity = makeEnvelope({
    id: makeEventId(`discord-reaction-${type.replace('.', '-')}`),
    type: `discord.reaction.${type}`,
    guildId,
    actorId: user?.id || null,
    actor: user,
    subject: { message_id: message.id },
    context: channelContext(message.channel, {
      channel_id: message.channelId,
      message_url: `https://discord.com/channels/${guildId}/${message.channelId}/${message.id}`,
    }),
    content: { emoji: normalizeEmoji(reaction.emoji) },
  });
  persistAndSchedule(activity);
  return activity;
}

function captureReactionsCleared(message, reactions = null) {
  const guildId = message?.guildId || message?.guild?.id;
  if (!isConfiguredGuild(guildId) || message?.author?.bot || message?.webhookId) return null;
  const activity = makeEnvelope({
    id: makeEventId('discord-reactions-cleared'),
    type: 'discord.reaction.cleared',
    guildId,
    subject: { message_id: message.id },
    context: channelContext(message.channel, { channel_id: message.channelId }),
    content: { reaction_count: reactions?.size ?? null },
  });
  persistAndSchedule(activity);
  return activity;
}

function captureVoiceState(oldState, newState) {
  const guildId = newState?.guild?.id || oldState?.guild?.id;
  if (!isConfiguredGuild(guildId) || oldState?.member?.user?.bot || newState?.member?.user?.bot) return null;
  const oldChannelId = oldState?.channelId || null;
  const newChannelId = newState?.channelId || null;
  if (oldChannelId === newChannelId) return null;

  const kind = oldChannelId && newChannelId ? 'moved' : newChannelId ? 'joined' : 'left';
  const channel = newState?.channel || oldState?.channel;
  const userId = newState?.id || oldState?.id || newState?.member?.id || oldState?.member?.id;
  const activity = makeEnvelope({
    id: makeEventId(`discord-voice-${kind}`),
    type: `discord.voice.${kind}`,
    guildId,
    actorId: userId,
    actor: newState?.member || oldState?.member,
    subject: userIdentity(newState?.member || oldState?.member, userId),
    context: channelContext(channel, { channel_id: newChannelId || oldChannelId, channel_type: 'voice' }),
    content: {
      from_channel_id: oldChannelId,
      to_channel_id: newChannelId,
    },
  });
  persistAndSchedule(activity);
  return activity;
}

function auditChangeValue(entry, key, side) {
  const change = entry?.changes?.find?.((item) => item.key === key);
  return change?.[side] ?? null;
}

function captureAuditLogEntry(entry, guild) {
  const guildId = guild?.id || entry?.guild?.id;
  if (!isConfiguredGuild(guildId)) return null;
  const mapping = {
    [AuditLogEvent.ChannelCreate]: 'discord.channel.created',
    [AuditLogEvent.ChannelDelete]: 'discord.channel.deleted',
    [AuditLogEvent.ThreadCreate]: 'discord.channel.created',
    [AuditLogEvent.ThreadDelete]: 'discord.channel.deleted',
    [AuditLogEvent.MemberKick]: 'discord.member.kicked',
    [AuditLogEvent.MemberBanAdd]: 'discord.member.banned',
  };
  const type = mapping[entry.action];
  if (!type) return null;

  const target = entry.target || {};
  const targetId = entry.targetId || target.id || null;
  const isChannel = type.startsWith('discord.channel.');
  const activity = makeEnvelope({
    id: makeEventId('discord-audit', entry.id),
    type,
    occurredAt: entry.createdAt?.toISOString?.() || nowIso(),
    guildId,
    actorId: entry.executorId || entry.executor?.id || null,
    actor: entry.executor,
    subject: isChannel
      ? { channel_id: targetId }
      : userIdentity(target, targetId),
    context: isChannel ? channelContext(target, { channel_id: targetId }) : {},
    content: {
      reason: entry.reason || null,
      name: target.name || auditChangeValue(entry, 'name', type.endsWith('deleted') ? 'old' : 'new') || null,
      audit_log_entry_id: entry.id,
    },
  });
  persistAndSchedule(activity);
  return activity;
}

function normalizedOptionValue(option, interaction) {
  switch (option.type) {
    case ApplicationCommandOptionType.User:
    case ApplicationCommandOptionType.Channel:
    case ApplicationCommandOptionType.Role:
    case ApplicationCommandOptionType.Mentionable:
      return { discord_id: String(option.value) };
    case ApplicationCommandOptionType.Attachment: {
      const attachment = interaction.options?.resolved?.attachments?.get?.(option.value);
      return attachment ? normalizeAttachments(new Map([[attachment.id, attachment]]))[0] : { id: String(option.value) };
    }
    default:
      return option.value ?? null;
  }
}

function normalizeCommandOptions(options, interaction) {
  return (options || []).map((option) => ({
    name: option.name,
    type: option.type,
    value: option.options
      ? normalizeCommandOptions(option.options, interaction)
      : normalizedOptionValue(option, interaction),
  }));
}

function beginSlashCommandActivity(interaction) {
  if (!isConfiguredGuild(interaction?.guildId)) return null;
  const occurredAt = interaction.createdAt?.toISOString?.() || nowIso();
  const eventId = makeEventId('discord-command', interaction.id);
  const activity = makeEnvelope({
    id: eventId,
    type: 'discord.slash_command.invoked',
    occurredAt,
    guildId: interaction.guildId,
    actorId: interaction.user?.id || null,
    actor: interaction.member || interaction.user,
    subject: { interaction_id: interaction.id },
    context: channelContext(interaction.channel, { channel_id: interaction.channelId }),
    content: {
      command: interaction.commandName,
      subcommand_group: interaction.options?.getSubcommandGroup?.(false) || null,
      subcommand: interaction.options?.getSubcommand?.(false) || null,
      options: normalizeCommandOptions(interaction.options?.data, interaction),
      outcome: null,
      failure_code: null,
      duration_ms: null,
    },
  });
  const result = persistAndSchedule(activity, 'capturing');
  return result.inserted ? { eventId, startedAt: Date.parse(occurredAt) } : null;
}

function safeFailureCode(error) {
  const candidate = error?.code || error?.name || 'COMMAND_FAILED';
  const value = String(candidate);
  return /^[A-Za-z0-9_.:-]{1,100}$/.test(value) ? value : 'COMMAND_FAILED';
}

function finishSlashCommandActivity(capture, outcome, error = null) {
  if (!capture) return false;
  const finishedAt = Date.now();
  const finalized = store.finalizeCapturingActivity(capture.eventId, {
    outcome,
    failure_code: error ? safeFailureCode(error) : null,
    duration_ms: Number.isFinite(capture.startedAt) ? Math.max(0, finishedAt - capture.startedAt) : null,
  }, new Date(finishedAt).toISOString());
  if (finalized) void scheduleEvent(capture.eventId);
  return finalized;
}

function extractAnnouncementTitle(message) {
  const embedTitle = message?.embeds?.find?.((embed) => embed?.title)?.title;
  if (embedTitle) return embedTitle;
  const firstLine = message?.content?.split?.(/\r?\n/, 1)?.[0]?.trim();
  return firstLine ? firstLine.slice(0, 250) : null;
}

function buildAnnouncementAcknowledgmentActivity(interaction, tracking) {
  const message = interaction.message;
  const guildId = interaction.guildId || message.guildId;
  const acknowledgedAt = nowIso();
  return makeEnvelope({
    id: makeEventId('discord-announcement-acknowledged', `${message.id}:${interaction.user.id}`),
    type: 'discord.announcement.acknowledged',
    occurredAt: acknowledgedAt,
    guildId,
    actorId: interaction.user.id,
    actor: interaction.member || interaction.user,
    subject: { announcement_id: message.id },
    context: channelContext(message.channel, {
      channel_id: tracking.channel_id || message.channelId,
      thread_id: tracking.thread_id || null,
      message_url: `https://discord.com/channels/${guildId}/${tracking.channel_id || message.channelId}/${message.id}`,
    }),
    content: {
      announcement_id: message.id,
      announcement_title: extractAnnouncementTitle(message),
      announcement_message_url: `https://discord.com/channels/${guildId}/${tracking.channel_id || message.channelId}/${message.id}`,
      acknowledged_at: acknowledgedAt,
    },
  });
}

function recordAnnouncementAcknowledgmentActivity(interaction) {
  if (!isConfiguredGuild(interaction?.guildId || interaction?.message?.guildId)) return null;
  const result = store.recordAnnouncementAcknowledgment(
    interaction.message.id,
    interaction.user.id,
    (tracking) => buildAnnouncementAcknowledgmentActivity(interaction, tracking),
  );
  if (result.recorded) void scheduleEvent(result.eventId);
  return result;
}

module.exports = {
  beginSlashCommandActivity,
  buildAnnouncementAcknowledgmentActivity,
  captureAuditLogEntry,
  captureMessageCreated,
  captureMessageDeleted,
  captureMessageEdited,
  captureReaction,
  captureReactionsCleared,
  captureVoiceState,
  channelContext,
  finishSlashCommandActivity,
  isActivityLogEnabled,
  isConfiguredGuild,
  makeEnvelope,
  normalizeCommandOptions,
  normalizeMessageSnapshot,
  persistAndSchedule,
  recordAnnouncementAcknowledgmentActivity,
  scheduleEvent,
  safelyCapture,
  validateActivityConfiguration,
};
