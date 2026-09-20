const { captureNicknameChanged, safelyCapture } = require('../../utils/discordActivity');

module.exports = {
  name: 'guildMemberUpdate',
  execute(oldMember, newMember) {
    safelyCapture('nickname changed', () => captureNicknameChanged(oldMember, newMember));
  },
};
