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
const { scheduleMeetingVoiceFinishJob } = require('../../queue/meetingVoiceQueue');
const {
  handleMeetingVoiceStateUpdate,
} = require('../../functions/helpers/meetingVoiceAttendance');
const { captureVoiceState, safelyCapture } = require('../../utils/discordActivity');
const {
  isBreakRoomsVoiceState,
  sendBreakRoomsVoiceWebhook,
} = require('../../utils/breakRoomsVoiceWebhook');

module.exports = {
  name: "voiceStateUpdate",
  async execute(oldState, newState, client) {
    safelyCapture('voice state', () => captureVoiceState(oldState, newState));
    if (process.env.node_env === "test") return;

    safelyCapture('Break Rooms voice webhook', () => sendBreakRoomsVoiceWebhook(oldState, newState));

    const oldChannelId = oldState.channelId;
    const newChannelId = newState.channelId;
    const leftBreakRooms = isBreakRoomsVoiceState(oldState);
    const joinedBreakRooms = isBreakRoomsVoiceState(newState);
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

    handleMeetingVoiceStateUpdate(oldState, newState, {
      scheduleFinish: scheduleMeetingVoiceFinishJob,
    }).catch((error) => {
      console.error('Meeting voice attendance handling failed:', error);
    });

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
    } else if (joinedAnyVoice && !joinedBreakRooms) {
      client.events.get("managementIn").execute(oldState, newState, client);
    } else if (leftAllVoice && !leftBreakRooms) {
      client.events.get("managementOut").execute(oldState, newState, client);
      await handleDepartmentVoiceCheckOut(oldState, client);
    } else if (movedBetweenMeetingVoices) {
      await handleDepartmentVoiceMeetingPause(oldState, newState, client);
    }
  },
};
