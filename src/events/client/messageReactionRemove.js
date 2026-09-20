const { captureReaction, safelyCapture } = require('../../utils/discordActivity');

module.exports = {
  name: 'messageReactionRemove',
  execute(reaction, user) {
    safelyCapture('reaction removed', () => captureReaction('removed', reaction, user));
  },
};
