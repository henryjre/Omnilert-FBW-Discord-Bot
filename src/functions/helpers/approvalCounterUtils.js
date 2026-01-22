const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const departments = require('../../config/departments.json');

/**
 * Get emoji for approval count (0-10)
 * @param {number} count - The approval count
 * @returns {string|null} Emoji string or null if count > 10
 */
function getApprovalEmoji(count) {
  const emojiMap = {
    0: '0️⃣',
    1: '1️⃣',
    2: '2️⃣',
    3: '3️⃣',
    4: '4️⃣',
    5: '5️⃣',
    6: '6️⃣',
    7: '7️⃣',
    8: '8️⃣',
    9: '9️⃣',
    10: '🔟'
  };
  return emojiMap[count] || null;
}

/**
 * Check if a channel is a schedule channel from departments.json
 * @param {string} channelId - The channel ID to check
 * @returns {boolean} True if channel is a schedule channel
 */
function isScheduleChannel(channelId) {
  return departments.some(dept => dept.scheduleChannel === channelId);
}

/**
 * Update the starter message's currentApprovalsButton with new count
 * @param {import('discord.js').ThreadChannel} thread - The thread channel
 * @param {number} count - The current approval count
 */
async function updateStarterMessageApprovals(thread, count) {
  try {
    const starterMessage = await thread.fetchStarterMessage();
    const components = starterMessage.components;

    if (!components || components.length === 0) {
      console.log('No components found on starter message');
      return;
    }

    // Find and update the currentApprovalsButton
    let updated = false;
    const newComponents = components.map(row => {
      const newRow = ActionRowBuilder.from(row);
      const buttons = newRow.components.map(button => {
        if (button.data.custom_id === 'currentApprovalsButton') {
          const emoji = getApprovalEmoji(count);
          const builder = ButtonBuilder.from(button);

          if (count > 10) {
            // Remove emoji, set label to count
            builder
              .setEmoji(null)
              .setLabel(`${count} Current Approvals`)
              .setStyle(ButtonStyle.Success);
          } else {
            // Set emoji, keep label as "Current Approvals"
            builder
              .setEmoji(emoji)
              .setLabel('Current Approvals')
              .setStyle(count > 0 ? ButtonStyle.Success : ButtonStyle.Secondary);
          }

          updated = true;
          return builder;
        }
        return button;
      });
      newRow.setComponents(buttons);
      return newRow;
    });

    if (updated) {
      await starterMessage.edit({ components: newComponents });
      console.log(`Updated starter message approval count to ${count} for thread ${thread.id}`);
    } else {
      console.log('currentApprovalsButton not found in starter message');
    }
  } catch (error) {
    console.error('Error updating starter message approvals:', error.message);
  }
}

// Export as a module that returns the functions (for index.js compatibility)
module.exports = (client) => {
  // This file doesn't need client, but we export a function for consistency
  return {
    getApprovalEmoji,
    isScheduleChannel,
    updateStarterMessageApprovals,
  };
};

// Also export directly for direct imports
module.exports.getApprovalEmoji = getApprovalEmoji;
module.exports.isScheduleChannel = isScheduleChannel;
module.exports.updateStarterMessageApprovals = updateStarterMessageApprovals;
