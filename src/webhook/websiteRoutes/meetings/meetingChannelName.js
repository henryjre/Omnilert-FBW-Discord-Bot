const moment = require('moment-timezone');

const DISCORD_CHANNEL_NAME_LIMIT = 100;
const MEETING_TIMEZONE = 'Asia/Manila';
const MEETING_DATE_FORMAT = 'MMMM DD [at] h:mm A';
const MEETING_CHANNEL_NAME_DATE_FORMAT = 'MMM DD, h:mm A';

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

// Prefixes the channel name with the Manila start time, e.g. "Jul 15, 10:00 AM | Title".
// Falls back to just the title when `starts_at` is missing or unparseable.
function buildMeetingChannelName(meeting) {
  const title = toDisplay(meeting?.title);
  const startsAt = meeting?.starts_at;

  let prefix = '';
  if (isNonEmptyString(startsAt)) {
    const parsed = moment.utc(startsAt, moment.ISO_8601, true);
    if (parsed.isValid()) {
      prefix = `${parsed.tz(MEETING_TIMEZONE).format(MEETING_CHANNEL_NAME_DATE_FORMAT)} | `;
    }
  }

  return normalizeChannelName(`${prefix}${title}`);
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

module.exports = {
  DISCORD_CHANNEL_NAME_LIMIT,
  MEETING_TIMEZONE,
  MEETING_DATE_FORMAT,
  MEETING_CHANNEL_NAME_DATE_FORMAT,
  isNonEmptyString,
  toDisplay,
  normalizeChannelName,
  buildMeetingChannelName,
  formatMeetingStartsAt,
  formatMeetingDuration,
};
