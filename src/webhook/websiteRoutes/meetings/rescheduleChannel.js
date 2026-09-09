const {
  ContainerBuilder,
  MessageFlags,
  SeparatorSpacingSize,
} = require('discord.js');

const { resolveDiscordChannel } = require('./deleteChannel');
const {
  buildMeetingChannelName,
  isNonEmptyString,
  toDisplay,
  formatMeetingStartsAt,
  formatMeetingDuration,
} = require('./meetingChannelName');

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

  const container = new ContainerBuilder()
    .setAccentColor(0x5865f2)
    .addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(
        [
          '## 🔄 Meeting Rescheduled',
          `**${toDisplay(meeting.title)}**`,
        ].join('\n'),
      ),
    )
    .addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Small))
    .addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(
        [
          '### 🕒 New Schedule',
          `> ~~${formatMeetingStartsAt(payload.previous_starts_at)}~~ → **${formatMeetingStartsAt(payload.starts_at)}**`,
          `> **Duration:** ${formatMeetingDuration(payload.duration_minutes)}`,
        ].join('\n'),
      ),
    );

  if (isNonEmptyString(payload.link_url)) {
    container
      .addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Small))
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(`### 🔗 Meeting Link\n[Open in Omnilert](${payload.link_url.trim()})`),
      );
  }

  container.addTextDisplayComponents((textDisplay) => textDisplay.setContent(countLine));

  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { parse: [] },
  };
}

async function rescheduleMeetingVoiceChannel({ clientInstance, payload }) {
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

  return { rescheduled: true };
}

module.exports.isValidMeetingReschedulePayload = isValidMeetingReschedulePayload;
module.exports.buildMeetingRescheduleMessage = buildMeetingRescheduleMessage;
module.exports.rescheduleMeetingVoiceChannel = rescheduleMeetingVoiceChannel;
