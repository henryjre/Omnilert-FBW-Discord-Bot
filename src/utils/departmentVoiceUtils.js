const moment = require('moment-timezone');
const {
  ChannelType,
  ContainerBuilder,
  MessageFlags,
  SeparatorSpacingSize,
  ThreadAutoArchiveDuration,
} = require('discord.js');

const {
  getDepartments,
  getActiveDepartmentVoiceSessionByUser,
  getActiveDepartmentVoiceSessionByThreadUser,
  getDepartmentVoiceSessionByUserDate,
  markActiveDepartmentVoiceSessionCheckedOut,
  pauseDepartmentVoiceSession,
  recordDepartmentVoiceSessionUpdate,
  resumeDepartmentVoiceSession,
  upsertDepartmentVoiceSession,
} = require('../sqliteFunctions');
const {
  formatDepartmentChannelName,
  syncDepartmentChannelPermissions,
} = require('./departmentUtils');
const departmentVoiceTestUsers = require('../config/department_voice_test_users.json');

const OFFICE_VOICE_CHANNEL_ID = '1314413190074994690';
const MANILA_TIMEZONE = 'Asia/Manila';
const DEPARTMENT_VOICE_REMINDER_MINUTES = [15, 25];
const DEPARTMENT_VOICE_TIMEOUT_MINUTES = 30;

function getManilaMoment(date = new Date()) {
  return moment(date).tz(MANILA_TIMEZONE);
}

function isDepartmentVoiceTestUser(userId) {
  if (!Array.isArray(departmentVoiceTestUsers) || departmentVoiceTestUsers.length === 0) {
    return false;
  }

  return departmentVoiceTestUsers.includes(String(userId));
}

function getDepartmentVoiceDateKey(date = new Date()) {
  return getManilaMoment(date).format('YYYY-MM-DD');
}

function getDepartmentVoiceThreadDate(date = new Date()) {
  return getManilaMoment(date).format('MMM DD, YYYY');
}

function getDepartmentVoiceDisplayTime(date = new Date()) {
  return getManilaMoment(date).format('MMM DD, YYYY [at] h:mm A');
}

function getMemberDisplayName(member) {
  const displayName =
    member?.nickname || member?.displayName || member?.user?.username || member?.user?.tag || 'Unknown User';
  return displayName.replace(/^(?:🟢|🔴)\s*(?:\|\s*)?/u, '').trim() || displayName;
}

function buildDepartmentVoiceThreadName(statusEmoji, member, date = new Date()) {
  return `${statusEmoji} | ${getDepartmentVoiceThreadDate(date)} | ${getMemberDisplayName(member)}`;
}

function replaceDepartmentVoiceThreadStatus(threadName, statusEmoji) {
  if (/^[^\s]+ \| /.test(threadName)) {
    return threadName.replace(/^[^\s]+/, statusEmoji);
  }
  return `${statusEmoji} | ${threadName}`;
}

function findMemberDepartment(member, departments = getDepartments()) {
  const memberRoles = member?.roles?.cache;
  if (!memberRoles) return null;

  return departments
    .filter((department) => department.role_id && memberRoles.has(department.role_id))
    .sort((a, b) => a.id - b.id)[0] || null;
}

async function resolveChannel(guild, channelId) {
  if (!guild || !channelId) return null;
  return guild.channels.cache.get(channelId) || (await guild.channels.fetch(channelId).catch(() => null));
}

async function findExistingDailyThread(parentChannel, expectedThreadName) {
  const cachedThread = parentChannel.threads?.cache?.find?.((thread) => thread.name === expectedThreadName);
  if (cachedThread) return cachedThread;

  const activeThreads = await parentChannel.threads?.fetchActive?.().catch(() => null);
  const activeThread = activeThreads?.threads?.find?.((thread) => thread.name === expectedThreadName);
  if (activeThread) return activeThread;

  const archivedThreads = await parentChannel.threads?.fetchArchived?.({ limit: 100 }).catch(() => null);
  return archivedThreads?.threads?.find?.((thread) => thread.name === expectedThreadName) || null;
}

async function createOrReuseDepartmentVoiceThread({ departmentChannel, member, now = new Date() }) {
  const greenName = buildDepartmentVoiceThreadName('🟢', member, now);
  const redName = buildDepartmentVoiceThreadName('🔴', member, now);
  let thread = await findExistingDailyThread(departmentChannel, greenName);

  if (!thread) {
    thread = await findExistingDailyThread(departmentChannel, redName);
  }

  if (thread) {
    if (thread.archived && thread.setArchived) await thread.setArchived(false);
    if (thread.name !== greenName && thread.setName) await thread.setName(greenName);
    if (thread.members?.add) await thread.members.add(member.id).catch(() => null);
    return thread;
  }

  thread = await departmentChannel.threads.create({
    name: greenName,
    autoArchiveDuration: ThreadAutoArchiveDuration.OneDay,
    type: ChannelType.PublicThread,
    reason: `Department voice check-in for ${member.user?.tag || member.id}`,
  });

  if (thread.members?.add) await thread.members.add(member.id).catch(() => null);
  return thread;
}

function buildDepartmentVoiceCheckInPayload(member, checkInAt = new Date()) {
  const container = new ContainerBuilder()
    .setAccentColor(0x2ecc71)
    .addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(
        [
          '## Check In',
          `**User:** <@${member.id}>`,
          `**Time:** ${getDepartmentVoiceDisplayTime(checkInAt)}`,
        ].join('\n')
      )
    )
    .addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Large))
    .addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(
        `<@${member.id}>, please update this thread at least every 30 minutes about the task you are doing. Images are accepted as long as they show your task on hand. If no updates are sent after 30 minutes, you will be removed from the voice channel and automatically checked out.`
      )
    );

  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  };
}

function buildDepartmentVoiceCheckOutPayload(memberId, checkOutAt = new Date()) {
  const container = new ContainerBuilder()
    .setAccentColor(0xe74c3c)
    .addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(
        ['## Check Out', `**User:** <@${memberId}>`, `**Time:** ${getDepartmentVoiceDisplayTime(checkOutAt)}`].join('\n')
      )
    );

  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  };
}

function buildDepartmentVoiceReminderPayload(userId, minutesLeft) {
  const container = new ContainerBuilder()
    .setAccentColor(0xf1c40f)
    .addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(
        `## Update Reminder\n<@${userId}>, you have **${minutesLeft} minute(s)** left to send an update before you are automatically checked out.`
      )
    );

  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  };
}

function buildDepartmentVoiceMeetingStartedPayload(memberId, channelId, pausedAt = new Date(), remainingSeconds = null) {
  const minutesLeft = remainingSeconds === null ? null : Math.ceil(remainingSeconds / 60);
  const remainingLine = minutesLeft === null ? null : `**Time Remaining:** ${minutesLeft} minute(s)`;
  const container = new ContainerBuilder()
    .setAccentColor(0x3498db)
    .addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(
        [
          '## Meeting Started',
          `**User:** <@${memberId}>`,
          `**Moved To:** <#${channelId}>`,
          `**Time:** ${getDepartmentVoiceDisplayTime(pausedAt)}`,
          remainingLine,
        ].filter(Boolean).join('\n')
      )
    )
    .addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Large))
    .addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(
        `The update timer is paused while <@${memberId}> is in that voice channel. It will resume when they return to <#${OFFICE_VOICE_CHANNEL_ID}>.`
      )
    );

  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  };
}

function buildDepartmentVoiceTimerResumedPayload(memberId, resumedAt = new Date(), remainingSeconds = null) {
  const minutesLeft = remainingSeconds === null ? null : Math.ceil(remainingSeconds / 60);
  const remainingLine = minutesLeft === null ? null : `**Time Remaining:** ${minutesLeft} minute(s)`;
  const container = new ContainerBuilder()
    .setAccentColor(0x2ecc71)
    .addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(
        [
          '## Timer Resumed',
          `**User:** <@${memberId}>`,
          `**Returned To:** <#${OFFICE_VOICE_CHANNEL_ID}>`,
          `**Time:** ${getDepartmentVoiceDisplayTime(resumedAt)}`,
          remainingLine,
        ].filter(Boolean).join('\n')
      )
    );

  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  };
}

function calculateDepartmentVoiceRemainingSeconds(session, pausedAt = new Date()) {
  if (session?.paused && Number.isFinite(Number(session.remaining_seconds))) {
    return Math.max(0, Number(session.remaining_seconds));
  }

  const lastUpdateAt = session?.last_update_at ? new Date(session.last_update_at) : pausedAt;
  const elapsedSeconds = Math.max(0, Math.floor((pausedAt.getTime() - lastUpdateAt.getTime()) / 1000));
  return Math.max(0, (DEPARTMENT_VOICE_TIMEOUT_MINUTES * 60) - elapsedSeconds);
}

async function handleDepartmentVoiceCheckIn(newState, scheduleJobs, now = new Date()) {
  const member = newState.member;
  if (!isDepartmentVoiceTestUser(member?.id)) return null;

  const department = findMemberDepartment(member);
  if (!department?.channel_id || !department.role_id) return null;

  const departmentChannel = await resolveChannel(newState.guild, department.channel_id);
  if (!departmentChannel?.threads) return null;

  await syncDepartmentChannelPermissions(newState.guild, departmentChannel, department.role_id);

  const dateKey = getDepartmentVoiceDateKey(now);
  const existingSession = getDepartmentVoiceSessionByUserDate(member.id, department.id, dateKey);
  const discordClient = newState.client || newState.guild?.client;
  let thread = existingSession?.thread_id
    ? await discordClient?.channels?.fetch?.(existingSession.thread_id).catch(() => null)
    : null;

  if (thread) {
    const greenName = buildDepartmentVoiceThreadName('🟢', member, now);
    if (thread.archived && thread.setArchived) await thread.setArchived(false);
    if (thread.name !== greenName && thread.setName) await thread.setName(greenName);
    if (thread.members?.add) await thread.members.add(member.id).catch(() => null);
  } else {
    thread = await createOrReuseDepartmentVoiceThread({
      departmentChannel,
      member,
      now,
    });
  }

  const checkInAt = now.toISOString();
  const session = upsertDepartmentVoiceSession({
    guildId: newState.guild.id,
    userId: member.id,
    departmentId: department.id,
    threadId: thread.id,
    voiceChannelId: OFFICE_VOICE_CHANNEL_ID,
    dateKey,
    checkInAt,
  });

  await thread.send(buildDepartmentVoiceCheckInPayload(member, now));
  if (scheduleJobs) await scheduleJobs(session);

  return { department, session, thread };
}

async function handleDepartmentVoiceCheckOut(oldState, client, now = new Date()) {
  const member = oldState.member;
  if (!isDepartmentVoiceTestUser(member?.id)) return null;

  const session = markActiveDepartmentVoiceSessionCheckedOut(member.id, now.toISOString());
  if (!session) return null;

  const thread = await client?.channels?.fetch?.(session.thread_id).catch(() => null);
  const resolvedThread = thread || oldState.guild.channels.cache.get(session.thread_id);

  if (resolvedThread?.setName) {
    await resolvedThread.setName(replaceDepartmentVoiceThreadStatus(resolvedThread.name, '🔴'));
  }

  if (resolvedThread?.send) {
    await resolvedThread.send(buildDepartmentVoiceCheckOutPayload(member.id, now));
  }

  return session;
}

async function handleDepartmentVoiceMeetingPause(oldState, newState, client, now = new Date()) {
  const member = oldState.member || newState.member;
  if (!isDepartmentVoiceTestUser(member?.id)) return null;

  const activeSession = getActiveDepartmentVoiceSessionByUser(member.id);
  if (!activeSession) return null;

  const remainingSeconds = calculateDepartmentVoiceRemainingSeconds(activeSession, now);
  const session = pauseDepartmentVoiceSession(
    member.id,
    now.toISOString(),
    newState.channelId,
    remainingSeconds
  );
  if (!session) return null;

  const thread = await client?.channels?.fetch?.(session.thread_id).catch(() => null);
  const resolvedThread = thread || oldState.guild?.channels?.cache?.get(session.thread_id);

  if (resolvedThread?.send && !activeSession.paused) {
    await resolvedThread.send(
      buildDepartmentVoiceMeetingStartedPayload(member.id, newState.channelId, now, remainingSeconds)
    );
  }

  return session;
}

async function handleDepartmentVoiceMeetingResume(newState, scheduleJobsFromRemaining, client, now = new Date()) {
  const member = newState.member;
  if (!isDepartmentVoiceTestUser(member?.id)) return null;

  const activeSession = getActiveDepartmentVoiceSessionByUser(member.id);
  if (!activeSession?.paused) return null;

  const remainingSeconds = Number.isFinite(Number(activeSession.remaining_seconds))
    ? Math.max(0, Number(activeSession.remaining_seconds))
    : DEPARTMENT_VOICE_TIMEOUT_MINUTES * 60;
  const session = resumeDepartmentVoiceSession(member.id, now.toISOString());
  if (!session) return null;

  const thread = await client?.channels?.fetch?.(session.thread_id).catch(() => null);
  const resolvedThread = thread || newState.guild?.channels?.cache?.get(session.thread_id);

  if (resolvedThread?.send) {
    await resolvedThread.send(buildDepartmentVoiceTimerResumedPayload(member.id, now, remainingSeconds));
  }

  if (scheduleJobsFromRemaining) {
    await scheduleJobsFromRemaining(session, remainingSeconds);
  }

  return session;
}

async function handleDepartmentVoiceUpdateMessage(message, scheduleJobs, now = new Date()) {
  if (message.author?.bot || !message.channel?.isThread?.()) return null;
  if (!isDepartmentVoiceTestUser(message.author.id)) return null;

  const session = getActiveDepartmentVoiceSessionByThreadUser(message.channel.id, message.author.id);
  if (!session) return null;

  const updatedSession = recordDepartmentVoiceSessionUpdate(session.id, now.toISOString());
  if (updatedSession && scheduleJobs) await scheduleJobs(updatedSession);

  return updatedSession;
}

module.exports = {
  DEPARTMENT_VOICE_REMINDER_MINUTES,
  DEPARTMENT_VOICE_TIMEOUT_MINUTES,
  MANILA_TIMEZONE,
  OFFICE_VOICE_CHANNEL_ID,
  buildDepartmentVoiceCheckInPayload,
  buildDepartmentVoiceCheckOutPayload,
  buildDepartmentVoiceMeetingStartedPayload,
  buildDepartmentVoiceReminderPayload,
  buildDepartmentVoiceTimerResumedPayload,
  buildDepartmentVoiceThreadName,
  calculateDepartmentVoiceRemainingSeconds,
  createOrReuseDepartmentVoiceThread,
  findMemberDepartment,
  getDepartmentVoiceDateKey,
  getDepartmentVoiceDisplayTime,
  handleDepartmentVoiceCheckIn,
  handleDepartmentVoiceCheckOut,
  handleDepartmentVoiceMeetingPause,
  handleDepartmentVoiceMeetingResume,
  handleDepartmentVoiceUpdateMessage,
  isDepartmentVoiceTestUser,
  replaceDepartmentVoiceThreadStatus,
  syncDepartmentChannelPermissions,
};
