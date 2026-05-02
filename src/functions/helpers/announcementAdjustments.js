const axios = require('axios');

const ANNOUNCEMENT_ADJUSTMENTS_URL =
  'https://omnilert.app/api/v1/integrations/discord/adjustments';

function extractAnnouncementTitle(description, fallbackTitle) {
  if (typeof description !== 'string') return fallbackTitle;

  const titleMatch = description.match(/^##\s+\*(.+?)\*\s*$/m);
  return titleMatch ? titleMatch[1].trim() : fallbackTitle;
}

function buildAcknowledgmentDeductionReason({ description, announcementId, messageUrl }) {
  const fallbackTitle = `Announcement ${announcementId}`;
  const title = extractAnnouncementTitle(description, fallbackTitle);

  return `Failure to acknowledge the announcement: ${title} - ${messageUrl}`;
}

function buildAcknowledgmentDeductionPayload(discordIds, reason) {
  return {
    discord_id: discordIds,
    adjustment_type: 'epi_adjustment',
    adjustment_direction: 'deduction',
    amount: 1,
    reason,
  };
}

async function sendAcknowledgmentDeduction(discordIds, reason, token = process.env.prodToken) {
  const response = await axios.post(
    ANNOUNCEMENT_ADJUSTMENTS_URL,
    buildAcknowledgmentDeductionPayload(discordIds, reason),
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data;
}

const announcementAdjustments = {
  ANNOUNCEMENT_ADJUSTMENTS_URL,
  buildAcknowledgmentDeductionPayload,
  buildAcknowledgmentDeductionReason,
  extractAnnouncementTitle,
  sendAcknowledgmentDeduction,
};

module.exports = Object.assign(() => announcementAdjustments, announcementAdjustments);
