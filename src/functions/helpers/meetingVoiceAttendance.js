const axios = require('axios');

const { OMNILERT_API_BASE_URL } = require('./onboardingUtils');

const MEETING_VOICE_FINISH_DELAY_MS = 5 * 60 * 1000;

function createJsonHeaders(token = process.env.prodToken) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

function buildMeetingVoiceJoinPayload(meetingId, discordUserId, joinedAt) {
  return {
    meeting_id: meetingId,
    discord_user_id: discordUserId,
    joined_at: joinedAt,
  };
}

function buildMeetingVoiceLeavePayload(meetingId, discordUserId, leftAt) {
  return {
    meeting_id: meetingId,
    discord_user_id: discordUserId,
    left_at: leftAt,
  };
}

function buildMeetingFinishedPayload(meetingId, endedAt) {
  return {
    meeting_id: meetingId,
    ended_at: endedAt,
  };
}

async function postMeetingVoiceJoin(
  meetingId,
  discordUserId,
  joinedAt,
  {
    httpClient = axios,
    token = process.env.prodToken,
    baseUrl = OMNILERT_API_BASE_URL,
  } = {},
) {
  const response = await httpClient.post(
    `${baseUrl}/meetings/voice-join`,
    buildMeetingVoiceJoinPayload(meetingId, discordUserId, joinedAt),
    { headers: createJsonHeaders(token) },
  );

  return response.data;
}

async function postMeetingVoiceLeave(
  meetingId,
  discordUserId,
  leftAt,
  {
    httpClient = axios,
    token = process.env.prodToken,
    baseUrl = OMNILERT_API_BASE_URL,
  } = {},
) {
  const response = await httpClient.post(
    `${baseUrl}/meetings/voice-leave`,
    buildMeetingVoiceLeavePayload(meetingId, discordUserId, leftAt),
    { headers: createJsonHeaders(token) },
  );

  return response.data;
}

async function postMeetingFinished(
  meetingId,
  endedAt,
  {
    httpClient = axios,
    token = process.env.prodToken,
    baseUrl = OMNILERT_API_BASE_URL,
  } = {},
) {
  const response = await httpClient.post(
    `${baseUrl}/meetings/finished`,
    buildMeetingFinishedPayload(meetingId, endedAt),
    { headers: createJsonHeaders(token) },
  );

  return response.data;
}

function getVoiceStateUserId(state) {
  return state?.id || state?.member?.id || state?.member?.user?.id || state?.user?.id || null;
}

function isBotVoiceState(oldState, newState) {
  return Boolean(
    oldState?.member?.user?.bot ||
    newState?.member?.user?.bot ||
    oldState?.user?.bot ||
    newState?.user?.bot,
  );
}

function getMemberId(member) {
  return member?.id || member?.user?.id || null;
}

function isBotMember(member) {
  return Boolean(member?.user?.bot || member?.bot);
}

function getCollectionValues(collection) {
  if (!collection) return [];
  if (typeof collection.values === 'function') return [...collection.values()];
  if (Array.isArray(collection)) return collection;
  return [];
}

function countNonBotMembers(channel, excludingUserId = null) {
  const members = getCollectionValues(channel?.members);

  return members.filter((member) => {
    const memberId = getMemberId(member);
    if (excludingUserId && memberId === excludingUserId) return false;
    return !isBotMember(member);
  }).length;
}

function fireAndLog(task, label, logger = console) {
  try {
    const promise = typeof task === 'function' ? task() : task;
    Promise.resolve(promise).catch((error) => {
      logger.error(`${label}:`, error);
    });
  } catch (error) {
    logger.error(`${label}:`, error);
  }
}

async function handleMeetingVoiceStateUpdate(
  oldState,
  newState,
  {
    repository = require('../../sqliteFunctions'),
    api = {
      postMeetingVoiceJoin,
      postMeetingVoiceLeave,
    },
    scheduleFinish = null,
    now = new Date(),
    logger = console,
  } = {},
) {
  if (isBotVoiceState(oldState, newState)) {
    return { ignored: true, reason: 'bot' };
  }

  const discordUserId = getVoiceStateUserId(newState) || getVoiceStateUserId(oldState);
  if (!discordUserId) {
    return { ignored: true, reason: 'missing-user' };
  }

  const oldChannelId = oldState?.channelId || null;
  const newChannelId = newState?.channelId || null;
  const changedChannels = oldChannelId !== newChannelId;

  if (!changedChannels) {
    return { ignored: true, reason: 'same-channel' };
  }

  const timestamp = now.toISOString();
  const oldMeeting = oldChannelId
    ? repository.getMeetingVoiceChannelByVoiceChannelId(oldChannelId)
    : null;
  const newMeeting = newChannelId
    ? repository.getMeetingVoiceChannelByVoiceChannelId(newChannelId)
    : null;
  const actions = [];

  if (oldMeeting) {
    actions.push('leave');
    fireAndLog(
      () => api.postMeetingVoiceLeave(oldMeeting.meeting_id, discordUserId, timestamp),
      'Meeting voice leave webhook failed',
      logger,
    );

    const remainingHumans = oldState?.channel
      ? countNonBotMembers(oldState.channel, discordUserId)
      : null;
    if (remainingHumans === 0 && !oldMeeting.finished_at) {
      const emptiedMeeting = repository.markMeetingVoiceChannelEmpty(
        oldMeeting.meeting_id,
        timestamp,
      );

      if (emptiedMeeting && typeof scheduleFinish === 'function') {
        await scheduleFinish(emptiedMeeting, MEETING_VOICE_FINISH_DELAY_MS);
        actions.push('schedule-finish');
      }
    }
  }

  if (newMeeting) {
    actions.push('join');
    repository.clearMeetingVoiceChannelEmptyState(newMeeting.meeting_id);
    fireAndLog(
      () => api.postMeetingVoiceJoin(newMeeting.meeting_id, discordUserId, timestamp),
      'Meeting voice join webhook failed',
      logger,
    );
  }

  if (actions.length === 0) {
    return { ignored: true, reason: 'non-meeting-channel' };
  }

  return { ignored: false, actions };
}

const meetingVoiceAttendance = {
  MEETING_VOICE_FINISH_DELAY_MS,
  buildMeetingFinishedPayload,
  buildMeetingVoiceJoinPayload,
  buildMeetingVoiceLeavePayload,
  countNonBotMembers,
  createJsonHeaders,
  handleMeetingVoiceStateUpdate,
  postMeetingFinished,
  postMeetingVoiceJoin,
  postMeetingVoiceLeave,
};

module.exports = Object.assign(() => meetingVoiceAttendance, meetingVoiceAttendance);
