const {
  captureMessageDeleted,
  safelyCapture,
} = require('../../utils/discordActivity');

module.exports = {
  name: 'messageDeleteBulk',
  execute(messages) {
    for (const message of messages.values()) {
      safelyCapture('bulk message deleted', () => captureMessageDeleted(message));
    }
  },
};
