const {
  OFFICE_VOICE_CHANNEL_ID,
  handleDepartmentVoiceCheckIn,
  handleDepartmentVoiceCheckOut,
} = require('../../utils/departmentVoiceUtils');
const { scheduleDepartmentVoiceSessionJobs } = require('../../queue/departmentVoiceQueue');

module.exports = {
  name: "voiceStateUpdate",
  async execute(oldState, newState, client) {
    if (process.env.node_env === "test") return;

    const oldChannelId = oldState.channelId;
    const newChannelId = newState.channelId;
    const joinedOfficeVoice = oldChannelId !== OFFICE_VOICE_CHANNEL_ID && newChannelId === OFFICE_VOICE_CHANNEL_ID;
    const leftOfficeVoice = oldChannelId === OFFICE_VOICE_CHANNEL_ID && newChannelId !== OFFICE_VOICE_CHANNEL_ID;
    const joinedAnyVoice = !oldChannelId && Boolean(newChannelId);
    const leftAllVoice = Boolean(oldChannelId) && !newChannelId;

    if (joinedOfficeVoice) {
      client.events.get("managementIn").execute(oldState, newState, client);
    } else if (leftOfficeVoice) {
      client.events.get("managementOut").execute(oldState, newState, client);
    } else if (joinedAnyVoice) {
      client.events.get("managementIn").execute(oldState, newState, client);
    } else if (leftAllVoice) {
      client.events.get("managementOut").execute(oldState, newState, client);
    }

    if (joinedOfficeVoice) {
      await handleDepartmentVoiceCheckIn(newState, scheduleDepartmentVoiceSessionJobs);
    }

    if (leftOfficeVoice) {
      await handleDepartmentVoiceCheckOut(oldState, client);
    }
  },
};
