const axios = require('axios');
const { OMNILERT_API_BASE_URL } = require('./onboardingUtils');

function createHeaders(token = process.env.prodToken) {
  return {
    Authorization: `Bearer ${token}`,
  };
}

async function getRegistrationStatus(email) {
  const response = await axios.get(`${OMNILERT_API_BASE_URL}/registration-requests/status`, {
    headers: createHeaders(),
    params: { email },
  });

  return response.data;
}

async function linkRegistrationRequestDiscordId(email, discordId) {
  const response = await axios.post(
    `${OMNILERT_API_BASE_URL}/registration-requests/discord-id`,
    { email, discord_id: discordId },
    {
      headers: {
        ...createHeaders(),
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data;
}

async function linkApprovedUserDiscordId(email, discordId) {
  const response = await axios.post(
    `${OMNILERT_API_BASE_URL}/users/discord-id`,
    { email, discord_id: discordId },
    {
      headers: {
        ...createHeaders(),
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data;
}

async function lookupApprovedUser(email) {
  const response = await axios.get(`${OMNILERT_API_BASE_URL}/users/lookup`, {
    headers: createHeaders(),
    params: { email },
  });

  return response.data;
}

module.exports = {
  getRegistrationStatus,
  linkApprovedUserDiscordId,
  linkRegistrationRequestDiscordId,
  lookupApprovedUser,
};
