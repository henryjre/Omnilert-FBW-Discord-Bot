const {
  MessageFlags,
  EmbedBuilder,
} = require('discord.js');

/**
 * Returns whether any message embed carries an image (proof).
 * ISPE and similar flows attach proof on extra embeds, not always embeds[0].
 *
 * @param {import("discord.js").Embed[]} embeds
 * @returns {boolean}
 */
function messageHasProofImage(embeds) {
  return embeds.some((embed) => {
    const imageUrl = embed.data?.image?.url ?? embed.image?.url;
    return typeof imageUrl === 'string' && imageUrl.length > 0;
  });
}

module.exports = {
  data: {
    name: `posOrderVerificationConfirm`
  },
  async execute(interaction, client) {
    try {
      let allEmbeds = interaction.message.embeds;
      const messageEmbed = allEmbeds[0];

      const replyEmbed = new EmbedBuilder();

      const mentionedUser = interaction.message.mentions.users.first();
      const mentionedRole = interaction.message.mentions.roles.first();

      if (mentionedUser) {
        // Handle user mention
        const isNotMentionedUser = interaction.user.id !== mentionedUser.id;

        if (isNotMentionedUser) {
          replyEmbed.setDescription(`🔴 ERROR: You cannot use this button.`).setColor('Red');

          return await interaction.reply({
            embeds: [replyEmbed],
            flags: MessageFlags.Ephemeral
          });
        }
      } else if (mentionedRole) {
        // Handle role mention
        const doesNotHaveRole = !interaction.member.roles.cache.has(mentionedRole.id);

        if (doesNotHaveRole) {
          replyEmbed.setDescription(`🔴 ERROR: You cannot use this button.`).setColor('Red');

          return await interaction.reply({
            embeds: [replyEmbed],
            flags: MessageFlags.Ephemeral
          });
        }
      }

      await interaction.deferUpdate();

      if (!messageHasProofImage(allEmbeds)) {
        return await interaction.followUp({
          content: `🔴 ERROR: No proof of order found. Please send a photo as proof in the thread below and click "Confirm" to verify.`,
          flags: MessageFlags.Ephemeral
        });
      }

      return await interaction.followUp({
        content: '🔴 ERROR: Branch POS channel routing is deprecated.',
        flags: MessageFlags.Ephemeral
      });
    } catch (error) {
      console.error('Error in order confirmation:', error);
      await interaction.followUp({
        content:
          '🔴 ERROR: An error occurred while processing your confirmation. Please try again.',
        flags: MessageFlags.Ephemeral
      });
    }
  }
};

function getPcfUpdate(messageEmbed, departmentId) {
  const embedDescription = messageEmbed.data?.description || '';
  const isOpeningPcf = embedDescription.includes('Opening PCF');
  const isClosingPcf =
    embedDescription.includes('Closing PCF') || embedDescription.includes('PCF Report');

  if (!isOpeningPcf && !isClosingPcf) {
    return null;
  }

  const sessionField = messageEmbed.data?.fields?.find((f) => f.name === 'Session Name');
  const countedFieldName = isOpeningPcf ? 'Opening PCF Counted' : 'Closing PCF Counted';
  const countedField = messageEmbed.data?.fields?.find((f) => f.name === countedFieldName);

  if (!sessionField || !countedField) {
    throw new Error('PCF confirmation is missing required fields.');
  }

  return {
    balance: extractPesoValue(countedField.value),
    companyId: departmentId,
    sessionId: sessionField.value,
    type: isOpeningPcf ? 'opening' : 'closing'
  };
}

function extractPesoValue(currencyStr) {
  const numericStr = currencyStr.replace('₱', '').replace(/,/g, '').trim();
  const value = parseFloat(numericStr);

  if (isNaN(value)) {
    throw new Error(`Invalid currency string: "${currencyStr}"`);
  }

  return value;
}
