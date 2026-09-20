const {
  captureMessageEdited,
  safelyCapture,
} = require('../../utils/discordActivity');

module.exports = {
  name: 'messageUpdate',
  execute(oldMessage, newMessage) {
    safelyCapture('message edited', () => captureMessageEdited(oldMessage, newMessage));
  },
};
