const express = require('express');
const AsyncLock = require('async-lock');
const moment = require('moment-timezone');
const {
  ChannelType,
  ContainerBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SeparatorSpacingSize,
} = require('discord.js');

const { extractBearerToken } = require('../notifications/cronNotifications');
const {
  deleteMeetingVoiceChannel,
  isValidMeetingDeleteChannelPayload,
} = require('./deleteChannel');
const {
  isValidMeetingUpdateParticipantsPayload,
  updateMeetingVoiceChannelParticipants,
} = require('./updateParticipants');

const router = express.Router();
const MEETING_VOICE_CATEGORY_ID = '1526460615932248174';
const DISCORD_CHANNEL_NAME_LIMIT = 100;
const MEETING_COMPANY_VALUE_LIMIT = 1024;
const MEETING_AGENDA_LIMIT = 2000;
const MEETING_TIMEZONE = 'Asia/Manila';
const MEETING_DATE_FORMAT = 'MMMM DD [at] h:mm A';

const lock = new AsyncLock();

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function toDisplay(value) {
  if (value === null || value === undefined) return 'N/A';

  const stringValue = String(value).trim();
  return stringValue.length === 0 ? 'N/A' : stringValue;
}

function normalizeChannelName(title) {
  const normalized = toDisplay(title).replace(/\s+/g, ' ').trim();
  if (normalized.length <= DISCORD_CHANNEL_NAME_LIMIT) return normalized;

  return normalized.slice(0, DISCORD_CHANNEL_NAME_LIMIT).trim();
}

function getParticipantDiscordIds(participants) {
  const seen = new Set();
  const ids = [];

  for (const participant of participants || []) {
    const id = participant?.discord_user_id;
    if (!isNonEmptyString(id) || seen.has(id)) continue;

    seen.add(id);
    ids.push(id);
  }

  return ids;
}

function collectUniqueNames(candidates) {
  const seen = new Set();
  const names = [];

  for (const name of candidates) {
    if (!isNonEmptyString(name)) continue;

    const trimmed = name.trim();
    if (seen.has(trimmed)) continue;

    seen.add(trimmed);
    names.push(trimmed);
  }

  return names;
}

function getMeetingCompanyNames(meeting) {
  if (Array.isArray(meeting?.companies) && meeting.companies.length > 0) {
    return collectUniqueNames(meeting.companies.map((company) => company?.name));
  }

  if (isNonEmptyString(meeting?.company_name)) {
    return collectUniqueNames([meeting.company_name]);
  }

  if (Array.isArray(meeting?.branches) && meeting.branches.length > 0) {
    return collectUniqueNames(meeting.branches.map((branch) => branch?.name));
  }

  return collectUniqueNames([meeting?.branch_name]);
}

function buildMeetingCompanyLine(meeting) {
  const names = getMeetingCompanyNames(meeting);
  const label = names.length > 1 ? 'Companies' : 'Company';

  if (names.length === 0) return { label, value: 'N/A' };

  let value = names.join(', ');
  if (value.length > MEETING_COMPANY_VALUE_LIMIT) {
    const suffix = ` +${names.length} total`;
    value = `${value.slice(0, MEETING_COMPANY_VALUE_LIMIT - suffix.length - 1).trim()}…${suffix}`;
  }

  return { label, value };
}

// `starts_at` arrives as a UTC ISO string; staff read schedules in Manila time.
function formatMeetingStartsAt(startsAt) {
  if (!isNonEmptyString(startsAt)) return 'N/A';

  const parsed = moment.utc(startsAt, moment.ISO_8601, true);
  if (!parsed.isValid()) return toDisplay(startsAt);

  return parsed.tz(MEETING_TIMEZONE).format(MEETING_DATE_FORMAT);
}

function formatMeetingDuration(durationMinutes) {
  if (!Number.isFinite(durationMinutes)) return 'N/A';

  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  const parts = [];

  if (hours > 0) parts.push(`${hours} hour${hours === 1 ? '' : 's'}`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes} minute${minutes === 1 ? '' : 's'}`);

  return parts.join(' ');
}

const getMeetingBranchNames = getMeetingCompanyNames;
const buildMeetingBranchLine = buildMeetingCompanyLine;

function isValidMeetingCreateChannelPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return false;
  if (payload.event !== 'meeting.create_channel') return false;
  if (typeof payload.version !== 'number') return false;
  if (!payload.meeting || typeof payload.meeting !== 'object') return false;
  if (!isNonEmptyString(payload.meeting.id)) return false;
  if (!isNonEmptyString(payload.meeting.title)) return false;
  if (!isNonEmptyString(payload.meeting.starts_at)) return false;
  if (!Number.isFinite(payload.meeting.duration_minutes)) return false;
  if (!Array.isArray(payload.participants)) return false;

  if (payload.meeting.companies !== undefined) {
    if (!Array.isArray(payload.meeting.companies)) return false;

    const companiesAreValid = payload.meeting.companies.every((company) => (
      company &&
      typeof company === 'object' &&
      isNonEmptyString(company.id) &&
      isNonEmptyString(company.name)
    ));

    if (!companiesAreValid) return false;
  }

  // `branches` is a legacy field from the previous website payload.
  if (payload.meeting.branches !== undefined) {
    if (!Array.isArray(payload.meeting.branches)) return false;

    const branchesAreValid = payload.meeting.branches.every((branch) => (
      branch &&
      typeof branch === 'object' &&
      isNonEmptyString(branch.id) &&
      isNonEmptyString(branch.name)
    ));

    if (!branchesAreValid) return false;
  }

  return payload.participants.every((participant) => (
    participant &&
    typeof participant === 'object' &&
    isNonEmptyString(participant.discord_user_id)
  ));
}

function isValidMeetingChannelWebhookPayload(payload) {
  if (payload?.event === 'meeting.create_channel') {
    return isValidMeetingCreateChannelPayload(payload);
  }

  if (payload?.event === 'meeting.delete_channel') {
    return isValidMeetingDeleteChannelPayload(payload);
  }

  if (payload?.event === 'meeting.update_participants') {
    return isValidMeetingUpdateParticipantsPayload(payload);
  }

  return false;
}

function resolveConfiguredGuildId() {
  return process.env.node_env === 'prod' ? process.env.prodGuildId : process.env.testGuildId;
}

async function resolveGuild(clientInstance, guildId) {
  if (!guildId) return null;

  let guild = clientInstance.guilds?.cache?.get?.(guildId);

  if (!guild && typeof clientInstance.guilds?.fetch === 'function') {
    guild = await clientInstance.guilds.fetch(guildId);
  }

  return guild || null;
}

function getStoredMeetingVoiceChannel(db, meetingId) {
  return (
    db
      .prepare(
        `
          SELECT meeting_id, voice_channel_id, guild_id
          FROM meeting_voice_channels
          WHERE meeting_id = ?
        `,
      )
      .get(meetingId) || null
  );
}

function saveMeetingVoiceChannel(db, { meetingId, voiceChannelId, guildId, payload }) {
  db.prepare(
    `
      INSERT INTO meeting_voice_channels (
        meeting_id,
        voice_channel_id,
        guild_id,
        payload,
        last_updated
      )
      VALUES (
        @meeting_id,
        @voice_channel_id,
        @guild_id,
        @payload,
        datetime('now')
      )
      ON CONFLICT(meeting_id) DO UPDATE SET
        voice_channel_id = excluded.voice_channel_id,
        guild_id = excluded.guild_id,
        payload = excluded.payload,
        last_updated = datetime('now')
    `,
  ).run({
    meeting_id: meetingId,
    voice_channel_id: voiceChannelId,
    guild_id: guildId,
    payload: payload ? JSON.stringify(payload) : null,
  });
}

function buildMeetingPermissionOverwrites(guild, clientInstance, participantIds) {
  const everyoneId = guild.roles?.everyone?.id || guild.id;
  const botUserId = clientInstance.user?.id || guild.members?.me?.id || null;

  const overwrites = [
    {
      id: everyoneId,
      deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
    },
    ...participantIds.map((participantId) => ({
      id: participantId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.Speak,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    })),
  ];

  if (botUserId && !participantIds.includes(botUserId)) {
    overwrites.push({
      id: botUserId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.Speak,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageChannels,
      ],
    });
  }

  return overwrites;
}

function buildMeetingContainer(payload, participantIds) {
  const meeting = payload.meeting || {};
  const creator = meeting.created_by || {};
  const company = buildMeetingCompanyLine(meeting);
  const agenda = isNonEmptyString(meeting.agenda)
    ? String(meeting.agenda).trim().slice(0, MEETING_AGENDA_LIMIT)
    : '_No agenda provided._';
  const createdBy = creator.discord_user_id
    ? `${toDisplay(creator.name)} (<@${creator.discord_user_id}>)`
    : toDisplay(creator.name);

  // Components V2 renders mentions inside the container as real pings, so the
  // participant list lives here instead of a separate content line.
  const participants = participantIds.length > 0
    ? participantIds.map((id) => `<@${id}>`).join(' ')
    : '_No participants assigned._';

  const container = new ContainerBuilder()
    .setAccentColor(0x5865f2)
    .addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(
        [
          `## 📅 ${toDisplay(meeting.title)}`,
          `-# ${company.label}: **${company.value}**`,
        ].join('\n'),
      ),
    )
    .addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Small))
    .addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(
        [
          '### 📝 Agenda',
          agenda,
        ].join('\n'),
      ),
    )
    .addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Small))
    .addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(
        [
          '### 🕒 Schedule',
          `> **Starts:** ${formatMeetingStartsAt(meeting.starts_at)}`,
          `> **Duration:** ${formatMeetingDuration(meeting.duration_minutes)}`,
          '',
          '### 👥 Participants',
          participants,
          '',
          '### ✍️ Organized By',
          createdBy,
        ].join('\n'),
      ),
    );

  if (isNonEmptyString(meeting.link_url)) {
    container
      .addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Small))
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(`### 🔗 Meeting Link\n[Open in Omnilert](${meeting.link_url.trim()})`),
      );
  }

  container.addTextDisplayComponents((textDisplay) =>
    textDisplay.setContent(`-# Meeting ID: \`${toDisplay(meeting.id)}\``),
  );

  return container;
}

function buildMeetingChannelMessage(payload, participantIds) {
  const uniqueParticipantIds = [...new Set(participantIds)];
  const creatorId = payload.meeting?.created_by?.discord_user_id;
  const mentionableIds = isNonEmptyString(creatorId) && !uniqueParticipantIds.includes(creatorId)
    ? [...uniqueParticipantIds, creatorId]
    : uniqueParticipantIds;

  return {
    components: [buildMeetingContainer(payload, uniqueParticipantIds)],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { users: mentionableIds, parse: [] },
  };
}

async function createMeetingVoiceChannel({
  clientInstance,
  db,
  payload,
  guildId,
  categoryId,
}) {
  const stored = getStoredMeetingVoiceChannel(db, payload.meeting.id);
  if (stored) return stored.voice_channel_id;

  const guild = await resolveGuild(clientInstance, guildId);
  if (!guild || typeof guild.channels?.create !== 'function') {
    throw new Error(`Discord guild ${guildId} not found or cannot create channels`);
  }

  const participantIds = getParticipantDiscordIds(payload.participants);
  const channel = await guild.channels.create({
    name: normalizeChannelName(payload.meeting.title),
    type: ChannelType.GuildVoice,
    parent: categoryId,
    reason: `Meeting channel created from webhook for ${payload.meeting.id}`,
    permissionOverwrites: buildMeetingPermissionOverwrites(
      guild,
      clientInstance,
      participantIds,
    ),
  });

  if (!channel || !channel.id || typeof channel.send !== 'function') {
    throw new Error('Created Discord voice channel is not sendable');
  }

  try {
    await channel.send(buildMeetingChannelMessage(payload, participantIds));

    saveMeetingVoiceChannel(db, {
      meetingId: payload.meeting.id,
      voiceChannelId: channel.id,
      guildId,
      payload,
    });
  } catch (error) {
    if (typeof channel.delete === 'function') {
      try {
        await channel.delete('Meeting webhook failed before completion');
      } catch (deleteError) {
        console.error('Failed to delete incomplete meeting voice channel:', deleteError);
      }
    }

    throw error;
  }

  return channel.id;
}

function createMeetingChannelWebhookHandler({
  clientInstance,
  db,
  expectedToken = process.env.prodToken,
  guildId = resolveConfiguredGuildId(),
  categoryId = MEETING_VOICE_CATEGORY_ID,
  lockInstance = lock,
} = {}) {
  return async (req, res) => {
    try {
      const authHeader = req.get ? req.get('authorization') : req.headers?.authorization;
      const providedToken = extractBearerToken(authHeader);

      if (!providedToken || !expectedToken || providedToken !== expectedToken) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      if (!isValidMeetingChannelWebhookPayload(req.body)) {
        return res.status(400).json({ success: false, message: 'Invalid payload' });
      }

      const resolvedClient = clientInstance || require('../../../index.js');
      const payload = req.body;

      if (payload.event === 'meeting.create_channel') {
        const resolvedDb = db || require('../../../sqliteConnection.js');
        const voiceChannelId = await lockInstance.acquire(
          payload.meeting.id,
          () => createMeetingVoiceChannel({
            clientInstance: resolvedClient,
            db: resolvedDb,
            payload,
            guildId,
            categoryId,
          }),
        );

        return res.status(200).json({
          success: true,
          voice_channel_id: voiceChannelId,
        });
      }

      if (payload.event === 'meeting.update_participants') {
        const result = await updateMeetingVoiceChannelParticipants({
          clientInstance: resolvedClient,
          payload,
        });

        return res.status(200).json({
          success: true,
          voice_channel_id: payload.voice_channel_id,
          updated: result.updated,
          added: result.added,
          removed: result.removed,
          ...(result.reason ? { reason: result.reason } : {}),
        });
      }

      const result = await deleteMeetingVoiceChannel({
        clientInstance: resolvedClient,
        payload,
      });

      return res.status(200).json({
        success: true,
        voice_channel_id: payload.voice_channel_id,
        deleted: result.deleted,
        ...(result.reason ? { reason: result.reason } : {}),
      });
    } catch (error) {
      console.error('Meeting channel webhook error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to process meeting channel webhook',
      });
    }
  };
}

const defaultMeetingChannelWebhookHandler = createMeetingChannelWebhookHandler();

router.post('/channel', defaultMeetingChannelWebhookHandler);
router.post('/create-channel', defaultMeetingChannelWebhookHandler);

module.exports = router;
module.exports.MEETING_VOICE_CATEGORY_ID = MEETING_VOICE_CATEGORY_ID;
module.exports.createMeetingChannelWebhookHandler = createMeetingChannelWebhookHandler;
module.exports.createMeetingCreateChannelHandler = createMeetingChannelWebhookHandler;
module.exports.createMeetingVoiceChannel = createMeetingVoiceChannel;
module.exports.isValidMeetingCreateChannelPayload = isValidMeetingCreateChannelPayload;
module.exports.isValidMeetingChannelWebhookPayload = isValidMeetingChannelWebhookPayload;
module.exports.isValidMeetingUpdateParticipantsPayload = isValidMeetingUpdateParticipantsPayload;
module.exports.updateMeetingVoiceChannelParticipants = updateMeetingVoiceChannelParticipants;
module.exports.normalizeChannelName = normalizeChannelName;
module.exports.getParticipantDiscordIds = getParticipantDiscordIds;
module.exports.getMeetingBranchNames = getMeetingBranchNames;
module.exports.buildMeetingBranchLine = buildMeetingBranchLine;
module.exports.getMeetingCompanyNames = getMeetingCompanyNames;
module.exports.buildMeetingCompanyLine = buildMeetingCompanyLine;
module.exports.formatMeetingStartsAt = formatMeetingStartsAt;
module.exports.formatMeetingDuration = formatMeetingDuration;
module.exports.buildMeetingPermissionOverwrites = buildMeetingPermissionOverwrites;
module.exports.buildMeetingContainer = buildMeetingContainer;
module.exports.buildMeetingChannelMessage = buildMeetingChannelMessage;
module.exports.getStoredMeetingVoiceChannel = getStoredMeetingVoiceChannel;
module.exports.saveMeetingVoiceChannel = saveMeetingVoiceChannel;
