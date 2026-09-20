const { captureReaction, safelyCapture } = require('../../utils/discordActivity');

module.exports = {
  name: 'messageReactionRemoveEmoji',
  execute(reaction) {
    safelyCapture('reaction emoji cleared', () => captureReaction('cleared', reaction));
  },
};
