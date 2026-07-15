const { resolveDiscordChannel } = require('./deleteChannel');

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidParticipantUpdateUser(participant) {
  return (
    participant &&
    typeof participant === 'object' &&
    isNonEmptyString(participant.discord_user_id)
  );
}

function isValidMeetingUpdateParticipantsPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return false;
  if (payload.event !== 'meeting.update_participants') return false;
  if (typeof payload.version !== 'number') return false;
  if (!payload.meeting || typeof payload.meeting !== 'object') return false;
  if (!isNonEmptyString(payload.meeting.id)) return false;
  if (!isNonEmptyString(payload.voice_channel_id)) return false;
  if (!Array.isArray(payload.added)) return false;
  if (!Array.isArray(payload.removed)) return false;

  return (
    payload.added.every(isValidParticipantUpdateUser) &&
    payload.removed.every(isValidParticipantUpdateUser)
  );
}

function getUniqueDiscordIds(participants) {
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

function buildMeetingParticipantPermissionOptions() {
  return {
    ViewChannel: true,
    Connect: true,
    Speak: true,
    SendMessages: true,
    ReadMessageHistory: true,
  };
}

async function updateMeetingVoiceChannelParticipants({ clientInstance, payload }) {
  const channel = await resolveDiscordChannel(clientInstance, payload.voice_channel_id);

  if (!channel) {
    return {
      updated: false,
      reason: 'not-found',
      added: 0,
      removed: 0,
    };
  }

  if (!channel.permissionOverwrites?.edit || !channel.permissionOverwrites?.delete) {
    throw new Error(`Discord channel ${payload.voice_channel_id} cannot update permissions`);
  }

  const addedIds = getUniqueDiscordIds(payload.added);
  const removedIds = getUniqueDiscordIds(payload.removed);
  const permissionOptions = buildMeetingParticipantPermissionOptions();

  for (const discordUserId of addedIds) {
    await channel.permissionOverwrites.edit(
      discordUserId,
      permissionOptions,
      { reason: `Meeting ${payload.meeting.id} participant added from webhook` },
    );
  }

  for (const discordUserId of removedIds) {
    await channel.permissionOverwrites.delete(
      discordUserId,
      `Meeting ${payload.meeting.id} participant removed from webhook`,
    );
  }

  return {
    updated: true,
    added: addedIds.length,
    removed: removedIds.length,
  };
}

module.exports.isValidMeetingUpdateParticipantsPayload = isValidMeetingUpdateParticipantsPayload;
module.exports.updateMeetingVoiceChannelParticipants = updateMeetingVoiceChannelParticipants;
module.exports.getUniqueDiscordIds = getUniqueDiscordIds;
module.exports.buildMeetingParticipantPermissionOptions = buildMeetingParticipantPermissionOptions;
