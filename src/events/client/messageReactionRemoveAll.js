const { captureReactionsCleared, safelyCapture } = require('../../utils/discordActivity');

module.exports = {
  name: 'messageReactionRemoveAll',
  execute(message, reactions) {
    safelyCapture('reactions cleared', () => captureReactionsCleared(message, reactions));
  },
};
