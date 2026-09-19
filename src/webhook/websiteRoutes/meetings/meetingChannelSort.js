const moment = require('moment-timezone');

// Meeting voice channels are ordered chronologically by their `starts_at`
// within the meeting category. Channels missing a parseable `starts_at`
// (e.g. legacy rows saved before this field was tracked) sort last.
function getStoredStartsAt(row) {
  if (!row?.payload) return null;

  try {
    const parsed = JSON.parse(row.payload);
    const startsAt = parsed?.meeting?.starts_at;
    if (typeof startsAt !== 'string') return null;

    const moment_ = moment.utc(startsAt, moment.ISO_8601, true);
    return moment_.isValid() ? moment_.valueOf() : null;
  } catch {
    return null;
  }
}

// Computes the Discord channel `position` a meeting voice channel should
// have within its category so channels stay sorted by start time, earliest
// first. `siblings` are the other stored meeting_voice_channels rows in the
// same guild; `excludeMeetingId` skips the channel being positioned itself.
function computeSortedPosition(siblings, startsAt, excludeMeetingId) {
  const targetTime = (() => {
    const parsed = moment.utc(startsAt, moment.ISO_8601, true);
    return parsed.isValid() ? parsed.valueOf() : null;
  })();

  const others = siblings.filter((row) => row.meeting_id !== excludeMeetingId);

  let position = 0;
  for (const row of others) {
    const otherTime = getStoredStartsAt(row);

    if (targetTime === null) {
      position += 1;
      continue;
    }

    if (otherTime !== null && otherTime <= targetTime) {
      position += 1;
    }
  }

  return position;
}

function getGuildMeetingVoiceChannels(db, guildId) {
  return db
    .prepare(
      `
        SELECT meeting_id, voice_channel_id, guild_id, payload
        FROM meeting_voice_channels
        WHERE guild_id = ?
      `,
    )
    .all(guildId);
}

module.exports = {
  getStoredStartsAt,
  computeSortedPosition,
  getGuildMeetingVoiceChannels,
};
