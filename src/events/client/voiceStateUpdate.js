const {
  OFFICE_VOICE_CHANNEL_ID,
  handleDepartmentVoiceCheckIn,
  handleDepartmentVoiceCheckOut,
  handleDepartmentVoiceMeetingPause,
  handleDepartmentVoiceMeetingResume,
} = require('../../utils/departmentVoiceUtils');
const {
  scheduleDepartmentVoiceSessionJobs,
  scheduleDepartmentVoiceSessionJobsFromRemaining,
} = require('../../queue/departmentVoiceQueue');

module.exports = {
  name: "voiceStateUpdate",
  async execute(oldState, newState, client) {
    if (process.env.node_env === "test") return;

    const oldChannelId = oldState.channelId;
    const newChannelId = newState.channelId;
    const joinedOfficeVoice = oldChannelId !== OFFICE_VOICE_CHANNEL_ID && newChannelId === OFFICE_VOICE_CHANNEL_ID;
    const leftOfficeForMeeting = oldChannelId === OFFICE_VOICE_CHANNEL_ID
      && Boolean(newChannelId)
      && newChannelId !== OFFICE_VOICE_CHANNEL_ID;
    const joinedAnyVoice = !oldChannelId && Boolean(newChannelId);
    const leftAllVoice = Boolean(oldChannelId) && !newChannelId;
    const movedBetweenMeetingVoices = oldChannelId
      && oldChannelId !== OFFICE_VOICE_CHANNEL_ID
      && newChannelId
      && newChannelId !== OFFICE_VOICE_CHANNEL_ID
      && oldChannelId !== newChannelId;

    if (joinedOfficeVoice) {
      const resumedSession = await handleDepartmentVoiceMeetingResume(
        newState,
        scheduleDepartmentVoiceSessionJobsFromRemaining,
        client
      );

      if (!resumedSession) {
        client.events.get("managementIn").execute(oldState, newState, client);
        await handleDepartmentVoiceCheckIn(newState, scheduleDepartmentVoiceSessionJobs);
      }
    } else if (leftOfficeForMeeting) {
      await handleDepartmentVoiceMeetingPause(oldState, newState, client);
    } else if (joinedAnyVoice) {
      client.events.get("managementIn").execute(oldState, newState, client);
    } else if (leftAllVoice) {
      client.events.get("managementOut").execute(oldState, newState, client);
      await handleDepartmentVoiceCheckOut(oldState, client);
    } else if (movedBetweenMeetingVoices) {
      await handleDepartmentVoiceMeetingPause(oldState, newState, client);
    }
  },
};
