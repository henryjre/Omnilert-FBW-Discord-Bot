const { resolveDiscordChannel } = require('./deleteChannel');
const {
  buildMeetingChannelName,
  isNonEmptyString,
  toDisplay,
  formatMeetingStartsAt,
  formatMeetingDuration,
} = require('./meetingChannelName');
const {
  computeSortedPosition,
  getGuildMeetingVoiceChannels,
} = require('./meetingChannelSort');

function isValidMeetingReschedulePayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return false;
  if (payload.event !== 'meeting.reschedule') return false;
  if (typeof payload.version !== 'number') return false;
  if (!payload.meeting || typeof payload.meeting !== 'object') return false;
  if (!isNonEmptyString(payload.meeting.id)) return false;
  if (!isNonEmptyString(payload.meeting.title)) return false;
  if (!isNonEmptyString(payload.voice_channel_id)) return false;
  if (!isNonEmptyString(payload.previous_starts_at)) return false;
  if (!isNonEmptyString(payload.starts_at)) return false;
  if (!Number.isFinite(payload.duration_minutes)) return false;
  if (!Number.isFinite(payload.rescheduled_count)) return false;
  if (payload.link_url !== null && !isNonEmptyString(payload.link_url)) return false;

  return true;
}

function buildMeetingRescheduleMessage(payload) {
  const meeting = payload.meeting || {};
  const count = payload.rescheduled_count;
  const countLine = `-# Rescheduled ${count} time${count === 1 ? '' : 's'}`;

  const lines = [
    '## 🔄 Meeting Rescheduled',
    `**${toDisplay(meeting.title)}**`,
    '',
    '### 🕒 New Schedule',
    `> ~~${formatMeetingStartsAt(payload.previous_starts_at)}~~ → **${formatMeetingStartsAt(payload.starts_at)}**`,
    `> **Duration:** ${formatMeetingDuration(payload.duration_minutes)}`,
  ];

  if (isNonEmptyString(payload.link_url)) {
    lines.push('', '### 🔗 Meeting Link', `[Open in Omnilert](${payload.link_url.trim()})`);
  }

  lines.push('', countLine);

  return {
    content: lines.join('\n'),
    allowedMentions: { parse: [] },
  };
}

function getStoredMeetingVoiceChannelRow(db, meetingId) {
  return (
    db
      .prepare(
        `
          SELECT meeting_id, voice_channel_id, guild_id, payload
          FROM meeting_voice_channels
          WHERE meeting_id = ?
        `,
      )
      .get(meetingId) || null
  );
}

function updateStoredMeetingStartsAt(db, meetingId, startsAt) {
  const row = getStoredMeetingVoiceChannelRow(db, meetingId);
  if (!row) return;

  let stored;
  try {
    stored = row.payload ? JSON.parse(row.payload) : {};
  } catch {
    stored = {};
  }

  stored.meeting = { ...(stored.meeting || {}), starts_at: startsAt };

  db.prepare(
    `
      UPDATE meeting_voice_channels
      SET payload = ?, last_updated = datetime('now')
      WHERE meeting_id = ?
    `,
  ).run(JSON.stringify(stored), meetingId);
}

async function rescheduleMeetingVoiceChannel({ clientInstance, db, payload }) {
  const channel = await resolveDiscordChannel(clientInstance, payload.voice_channel_id);

  if (!channel) {
    return { rescheduled: false, reason: 'not-found' };
  }

  if (typeof channel.setName !== 'function' || typeof channel.send !== 'function') {
    throw new Error(`Discord channel ${payload.voice_channel_id} cannot be rescheduled`);
  }

  await channel.setName(
    buildMeetingChannelName({ title: payload.meeting.title, starts_at: payload.starts_at }),
    `Meeting ${payload.meeting.id} rescheduled from webhook`,
  );

  await channel.send(buildMeetingRescheduleMessage(payload));

  if (db) {
    updateStoredMeetingStartsAt(db, payload.meeting.id, payload.starts_at);

    if (typeof channel.setPosition === 'function') {
      const siblings = getGuildMeetingVoiceChannels(db, channel.guildId || channel.guild?.id);
      const position = computeSortedPosition(siblings, payload.starts_at, payload.meeting.id);

      try {
        await channel.setPosition(position, {
          reason: `Meeting ${payload.meeting.id} resorted after reschedule`,
        });
      } catch (error) {
        console.error('Failed to reposition rescheduled meeting voice channel:', error);
      }
    }
  }

  return { rescheduled: true };
}

module.exports.isValidMeetingReschedulePayload = isValidMeetingReschedulePayload;
module.exports.buildMeetingRescheduleMessage = buildMeetingRescheduleMessage;
module.exports.rescheduleMeetingVoiceChannel = rescheduleMeetingVoiceChannel;
