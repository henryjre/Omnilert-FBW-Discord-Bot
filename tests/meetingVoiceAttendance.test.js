const test = require('node:test');
const assert = require('node:assert/strict');

const {
  MEETING_VOICE_FINISH_DELAY_MS,
  buildMeetingFinishedPayload,
  buildMeetingVoiceJoinPayload,
  buildMeetingVoiceLeavePayload,
  createJsonHeaders,
  handleMeetingVoiceStateUpdate,
  postMeetingFinished,
  postMeetingVoiceJoin,
  postMeetingVoiceLeave,
} = require('../src/functions/helpers/meetingVoiceAttendance');
const {
  completeMeetingVoiceFinishJob,
} = require('../src/queue/meetingVoiceQueue');

function createMember(id, bot = false) {
  return { id, user: { id, bot } };
}

function createChannel(id, members = []) {
  return {
    id,
    members: new Map(members.map((member) => [member.id, member])),
  };
}

function createState({ userId = 'user-1', channel = null, bot = false } = {}) {
  return {
    id: userId,
    channelId: channel?.id || null,
    channel,
    member: createMember(userId, bot),
  };
}

function createRepository(meetings) {
  const byMeetingId = new Map(meetings.map((meeting) => [meeting.meeting_id, { ...meeting }]));
  const calls = {
    clear: [],
    empty: [],
    finished: [],
  };

  return {
    calls,
    getMeetingVoiceChannelByVoiceChannelId: (channelId) => {
      for (const meeting of byMeetingId.values()) {
        if (meeting.voice_channel_id === channelId) return { ...meeting };
      }
      return null;
    },
    getMeetingVoiceChannelByMeetingId: (meetingId) => {
      const meeting = byMeetingId.get(meetingId);
      return meeting ? { ...meeting } : null;
    },
    clearMeetingVoiceChannelEmptyState: (meetingId) => {
      const meeting = byMeetingId.get(meetingId);
      calls.clear.push(meetingId);
      if (!meeting) return null;
      meeting.empty_since = null;
      meeting.empty_version = (Number(meeting.empty_version) || 0) + 1;
      return { ...meeting };
    },
    markMeetingVoiceChannelEmpty: (meetingId, emptySince) => {
      const meeting = byMeetingId.get(meetingId);
      calls.empty.push({ meetingId, emptySince });
      if (!meeting || meeting.finished_at) return null;
      meeting.empty_since = emptySince;
      meeting.empty_version = (Number(meeting.empty_version) || 0) + 1;
      return { ...meeting };
    },
    markMeetingVoiceChannelFinished: (meetingId, endedAt) => {
      const meeting = byMeetingId.get(meetingId);
      calls.finished.push({ meetingId, endedAt });
      if (!meeting || meeting.finished_at) return null;
      meeting.finished_at = endedAt;
      return { ...meeting };
    },
  };
}

function createApiRecorder() {
  const calls = {
    join: [],
    leave: [],
    finished: [],
  };

  return {
    calls,
    postMeetingVoiceJoin: async (...args) => {
      calls.join.push(args);
      return { success: true, ignored: false };
    },
    postMeetingVoiceLeave: async (...args) => {
      calls.leave.push(args);
      return { success: true, ignored: false };
    },
    postMeetingFinished: async (...args) => {
      calls.finished.push(args);
      return { success: true };
    },
  };
}

test('meeting voice payload builders and headers match Omnilert contract', () => {
  assert.deepEqual(
    buildMeetingVoiceJoinPayload('meeting-1', 'user-1', '2026-07-15T02:01:12.000Z'),
    {
      meeting_id: 'meeting-1',
      discord_user_id: 'user-1',
      joined_at: '2026-07-15T02:01:12.000Z',
    },
  );
  assert.deepEqual(
    buildMeetingVoiceLeavePayload('meeting-1', 'user-1', '2026-07-15T02:31:12.000Z'),
    {
      meeting_id: 'meeting-1',
      discord_user_id: 'user-1',
      left_at: '2026-07-15T02:31:12.000Z',
    },
  );
  assert.deepEqual(buildMeetingFinishedPayload('meeting-1', '2026-07-15T03:04:00.000Z'), {
    meeting_id: 'meeting-1',
    ended_at: '2026-07-15T03:04:00.000Z',
  });
  assert.deepEqual(createJsonHeaders('secret-token'), {
    Authorization: 'Bearer secret-token',
    'Content-Type': 'application/json',
  });
});

test('meeting voice API helpers post to the expected endpoints', async () => {
  const posts = [];
  const httpClient = {
    post: async (url, payload, options) => {
      posts.push({ url, payload, options });
      return { data: { success: true } };
    },
  };
  const options = {
    httpClient,
    token: 'secret-token',
    baseUrl: 'https://omnilert.app/api/v1/integrations/discord',
  };

  await postMeetingVoiceJoin('meeting-1', 'user-1', 'join-time', options);
  await postMeetingVoiceLeave('meeting-1', 'user-1', 'leave-time', options);
  await postMeetingFinished('meeting-1', 'end-time', options);

  assert.deepEqual(
    posts.map((post) => post.url),
    [
      'https://omnilert.app/api/v1/integrations/discord/meetings/voice-join',
      'https://omnilert.app/api/v1/integrations/discord/meetings/voice-leave',
      'https://omnilert.app/api/v1/integrations/discord/meetings/finished',
    ],
  );
  assert.deepEqual(posts[0].options.headers, createJsonHeaders('secret-token'));
});

test('join into meeting channel clears empty state and posts voice join', async () => {
  const repository = createRepository([
    {
      meeting_id: 'meeting-1',
      voice_channel_id: 'voice-1',
      empty_since: '2026-07-15T02:00:00.000Z',
      empty_version: 4,
      finished_at: null,
    },
  ]);
  const api = createApiRecorder();
  const now = new Date('2026-07-15T02:01:12.000Z');

  const result = await handleMeetingVoiceStateUpdate(
    createState(),
    createState({ channel: createChannel('voice-1', [createMember('user-1')]) }),
    { repository, api, now },
  );

  assert.deepEqual(result, { ignored: false, actions: ['join'] });
  assert.deepEqual(repository.calls.clear, ['meeting-1']);
  assert.deepEqual(api.calls.join, [['meeting-1', 'user-1', now.toISOString()]]);
  assert.deepEqual(api.calls.leave, []);
});

test('leave from meeting channel posts voice leave and schedules finish when empty', async () => {
  const repository = createRepository([
    {
      meeting_id: 'meeting-1',
      voice_channel_id: 'voice-1',
      empty_since: null,
      empty_version: 1,
      finished_at: null,
    },
  ]);
  const api = createApiRecorder();
  const scheduled = [];
  const now = new Date('2026-07-15T02:31:12.000Z');

  const result = await handleMeetingVoiceStateUpdate(
    createState({
      channel: createChannel('voice-1', [
        createMember('user-1'),
        createMember('bot-1', true),
      ]),
    }),
    createState(),
    {
      repository,
      api,
      now,
      scheduleFinish: async (...args) => scheduled.push(args),
    },
  );

  assert.deepEqual(result, { ignored: false, actions: ['leave', 'schedule-finish'] });
  assert.deepEqual(api.calls.leave, [['meeting-1', 'user-1', now.toISOString()]]);
  assert.equal(repository.calls.empty.length, 1);
  assert.equal(scheduled.length, 1);
  assert.equal(scheduled[0][0].meeting_id, 'meeting-1');
  assert.equal(scheduled[0][0].empty_version, 2);
  assert.equal(scheduled[0][1], MEETING_VOICE_FINISH_DELAY_MS);
});

test('moving between two meeting channels posts leave then join', async () => {
  const repository = createRepository([
    {
      meeting_id: 'meeting-1',
      voice_channel_id: 'voice-1',
      empty_since: null,
      empty_version: 1,
      finished_at: null,
    },
    {
      meeting_id: 'meeting-2',
      voice_channel_id: 'voice-2',
      empty_since: null,
      empty_version: 7,
      finished_at: null,
    },
  ]);
  const api = createApiRecorder();
  const scheduled = [];
  const now = new Date('2026-07-15T02:10:00.000Z');

  const result = await handleMeetingVoiceStateUpdate(
    createState({ channel: createChannel('voice-1', [createMember('user-1')]) }),
    createState({ channel: createChannel('voice-2', [createMember('user-1')]) }),
    {
      repository,
      api,
      now,
      scheduleFinish: async (...args) => scheduled.push(args),
    },
  );

  assert.deepEqual(result, { ignored: false, actions: ['leave', 'schedule-finish', 'join'] });
  assert.deepEqual(api.calls.leave, [['meeting-1', 'user-1', now.toISOString()]]);
  assert.deepEqual(api.calls.join, [['meeting-2', 'user-1', now.toISOString()]]);
  assert.deepEqual(repository.calls.clear, ['meeting-2']);
  assert.equal(scheduled.length, 1);
});

test('non-meeting channels and bot users are ignored', async () => {
  const repository = createRepository([]);
  const api = createApiRecorder();

  const nonMeeting = await handleMeetingVoiceStateUpdate(
    createState(),
    createState({ channel: createChannel('general-voice', [createMember('user-1')]) }),
    { repository, api },
  );
  const bot = await handleMeetingVoiceStateUpdate(
    createState(),
    createState({
      bot: true,
      channel: createChannel('general-voice', [createMember('bot-1', true)]),
      userId: 'bot-1',
    }),
    { repository, api },
  );

  assert.deepEqual(nonMeeting, { ignored: true, reason: 'non-meeting-channel' });
  assert.deepEqual(bot, { ignored: true, reason: 'bot' });
  assert.deepEqual(api.calls.join, []);
  assert.deepEqual(api.calls.leave, []);
});

test('finish job skips stale empty versions after a rejoin', async () => {
  const repository = createRepository([
    {
      meeting_id: 'meeting-1',
      voice_channel_id: 'voice-1',
      empty_since: null,
      empty_version: 3,
      finished_at: null,
    },
  ]);
  const api = createApiRecorder();
  const client = {
    channels: {
      cache: new Map([['voice-1', createChannel('voice-1')]]),
    },
  };

  const result = await completeMeetingVoiceFinishJob(
    {
      meetingId: 'meeting-1',
      voiceChannelId: 'voice-1',
      emptyVersion: 2,
    },
    client,
    { repository, api },
  );

  assert.deepEqual(result, { skipped: true, reason: 'stale-empty-version' });
  assert.deepEqual(api.calls.finished, []);
  assert.deepEqual(repository.calls.finished, []);
});

test('finish job posts finished and marks row when channel is still empty', async () => {
  const repository = createRepository([
    {
      meeting_id: 'meeting-1',
      voice_channel_id: 'voice-1',
      empty_since: '2026-07-15T02:59:00.000Z',
      empty_version: 5,
      finished_at: null,
    },
  ]);
  const api = createApiRecorder();
  const now = new Date('2026-07-15T03:04:00.000Z');
  const client = {
    channels: {
      cache: new Map([['voice-1', createChannel('voice-1', [createMember('bot-1', true)])]]),
    },
  };

  const result = await completeMeetingVoiceFinishJob(
    {
      meetingId: 'meeting-1',
      voiceChannelId: 'voice-1',
      emptyVersion: 5,
    },
    client,
    { repository, api, now },
  );

  assert.deepEqual(result, {
    success: true,
    meetingId: 'meeting-1',
    endedAt: now.toISOString(),
  });
  assert.deepEqual(api.calls.finished, [['meeting-1', now.toISOString()]]);
  assert.deepEqual(repository.calls.finished, [
    {
      meetingId: 'meeting-1',
      endedAt: now.toISOString(),
    },
  ]);
});
