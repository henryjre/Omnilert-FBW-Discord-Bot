const {
  MessageFlags,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  EmbedBuilder
} = require('discord.js');

const moment = require('moment-timezone');

const employeeNotificationChannelId = '1347592755706200155';
const auditingRoleId = '1428232349417607269';

const { createAuditSalaryAttachment, storeAuditRating } = require('../../../odooRpc.js');
const { cleanAuditDescription } = require('../../../functions/code/repeatFunctions.js');
const auditTypes = require('../../../config/audit_types.json');

module.exports = {
  data: {
    name: `auditNotifyEmployee`
  },
  async execute(interaction, client) {
    const mentionedUser = interaction.message.mentions?.users?.first() || null;
    const mentionedRole = interaction.message.mentions?.roles?.first() || null;

    if (mentionedUser) {
      const isNotMentionedUser = interaction.user.id !== mentionedUser.id;
      if (isNotMentionedUser) {
        return await interaction.reply({
          content: `🔴 ERROR: You cannot use this button.`,
          flags: MessageFlags.Ephemeral
        });
      }
    }

    if (mentionedRole) {
      const doesNotHaveRole = !interaction.member.roles.cache.has(mentionedRole.id);
      if (doesNotHaveRole) {
        return await interaction.reply({
          content: `🔴 ERROR: You cannot use this button.`,
          flags: MessageFlags.Ephemeral
        });
      }
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const allEmbeds = interaction.message.embeds;
    const messageEmbed = allEmbeds[0];

    const mentionableEmployeeFieldNames = ['Cashier Discord User', 'Employees On Duty'];
    const mentionableEmployeeField = messageEmbed.data.fields.find((f) =>
      mentionableEmployeeFieldNames.includes(f.name)
    );
    const mentionableEmployee = mentionableEmployeeField.value;
    const mentionableEmployees = mentionableEmployee.split('\n').join(' ');

    // Filter out the fields we want to remove
    if (messageEmbed.data && messageEmbed.data.fields) {
      // Keep track of how many blank fields we've seen
      let blankFieldCount = 0;

      messageEmbed.data.fields = messageEmbed.data.fields.filter((field) => {
        const fieldName = field.name;

        // Check if this is a blank field (both name and value are '\u200b')
        const isBlankField = field.name === '\u200b' && field.value === '\u200b';

        // If it's a blank field, increment our counter
        if (isBlankField) {
          blankFieldCount++;
        }

        return (
          fieldName !== 'Audited By' &&
          fieldName !== 'Violation Notice Link' &&
          fieldName !== 'Violation Notice Status' &&
          fieldName !== 'Audit Logs' &&
          // Only remove the last blank field (the second one)
          !(isBlankField && blankFieldCount === 2)
        );
      });
    }

    if (messageEmbed.data) {
      messageEmbed.data.color = 0x5865f2; // Discord Blurple color
    }

    const confirmButton = new ButtonBuilder()
      .setCustomId('acknowledgePenalty')
      .setLabel('Acknowledge')
      .setStyle(ButtonStyle.Success);

    const buttonRow = new ActionRowBuilder().addComponents(confirmButton);

    const employeeNotificationChannel = await client.channels.cache.get(
      employeeNotificationChannelId
    );

    const vnrButton = new ButtonBuilder()
      .setCustomId('auditVnr')
      .setLabel('Request VN')
      .setStyle(ButtonStyle.Primary);

    const notifyEmployeeButtonRow = new ActionRowBuilder().addComponents(vnrButton);

    const messagePayload = {
      content: mentionableEmployees,
      embeds: allEmbeds,
      components: [buttonRow]
    };

    await employeeNotificationChannel.send(messagePayload);

    await interaction.message.edit({ content: '', components: [notifyEmployeeButtonRow] });

    if (interaction.member.roles.cache.has(auditingRoleId)) {
      await interaction.member.roles.remove(auditingRoleId);
    }

    await createSalaryAttachment(interaction);
    await odooStoreAuditRating(interaction);

    const replyEmbed = new EmbedBuilder()
      .setDescription(`Employee has been notified successfully.`)
      .setColor('Green');
    await interaction.editReply({ embeds: [replyEmbed] });
  }
};

async function createSalaryAttachment(interaction) {
  const messageEmbed = interaction.message.embeds[0];
  const { audit_type, audit_id } = cleanAuditDescription(messageEmbed.data.description);
  const auditType = auditTypes.find((type) => type.name === audit_type);

  if (!auditType) {
    throw new Error('Audit type not found');
  }

  const startDate = moment().tz('Asia/Manila').format('YYYY-MM-DD');

  let payload = {
    discord_id: interaction.user.id,
    description: `${audit_type} | ${audit_id}`,
    type_id: 19, // Other Income
    type_code: 'OTHERINC',
    start_date: startDate,
    amount: 1
  };

  const ratePayload = { auditType: auditType };

  switch (auditType.code) {
    case 'SQAA':
      const orderAmountText = messageEmbed.data.fields.find((f) => f.name === 'Order Total').value;
      const orderAmount = parseFloat(orderAmountText.replace(/[^\d.]/g, ''));

      ratePayload.orderAmount = orderAmount;
      break;
    case 'SCSA':
      break;
    case 'PSA':
      break;
    case 'DTA':
      break;
    default:
      throw new Error('Audit type not found');
  }

  const rate = getRandomRate(ratePayload);
  if (!rate) {
    throw new Error('Rate not found');
  }
  payload.amount = rate;

  await createAuditSalaryAttachment(payload);
}

function getRandomRate(payload) {
  const auditType = payload.auditType;

  let rate = 1;
  switch (auditType.code) {
    case 'SQAA':
      for (const rateObj of auditType.rates) {
        if (
          payload.orderAmount >= rateObj.order_amount_min &&
          payload.orderAmount <= rateObj.order_amount_max
        ) {
          const randomRate =
            Math.random() * (rateObj.rate_max - rateObj.rate_min) + rateObj.rate_min;
          rate = Math.round(randomRate * 100) / 100; // Round to 2 decimal places
        }
      }
      break;
    case 'SCSA':
      const rateObj = auditType.rates[0];
      const randomRate = Math.random() * (rateObj.rate_max - rateObj.rate_min) + rateObj.rate_min;
      rate = Math.round(randomRate * 100) / 100; // Round to 2 decimal places
      break;
    case 'PSA':
      break;
    case 'DTA':
      break;
    default:
      return null;
  }

  return rate;
}

async function odooStoreAuditRating(interaction) {
  const messageEmbed = interaction.message.embeds[0];

  const ratingField = messageEmbed.fields.find((f) => f.name === 'Audit Rating');
  const rating = ratingField.value;
  const ratingInteger = starsToNumber(rating);

  const { audit_type, audit_id } = cleanAuditDescription(messageEmbed.data.description);
  const auditType = auditTypes.find((type) => type.name === audit_type);
  if (!auditType) {
    throw new Error('Audit type not found');
  }

  const auditedEmployee = messageEmbed.fields.find((f) => f.name === 'Cashier Discord User');
  const auditedEmployees = messageEmbed.fields.find((f) => f.name === 'Employees On Duty');

  const auditedDiscordIds = [];

  if (auditedEmployee) {
    auditedDiscordIds.push(extractUserId(auditedEmployee.value));
  }

  if (auditedEmployees) {
    const employees = auditedEmployees.value.split('\n').join(' ');
    for (const employee of employees) {
      auditedDiscordIds.push(extractUserId(employee));
    }
  }

  if (!auditedDiscordIds.length) {
    throw new Error('Audited employees not found');
  }

  const auditDate = moment().tz('Asia/Manila').utc().format('YYYY-MM-DD HH:mm:ss');

  for (const discordId of auditedDiscordIds) {
    const payload = {
      description: audit_type,
      audit_code: auditType.code,
      audit_id: audit_id,
      rating: ratingInteger,
      audit_date: auditDate,
      discord_id: discordId
    };

    await storeAuditRating(payload);
  }

  function starsToNumber(input) {
    if (!input || typeof input !== 'string') return 0;

    // Match both standard and variant star emojis
    const starRegex = /[\u2B50\uFE0F\u2605\u2728\uD83C\uDF1F]/g;

    const matches = input.match(starRegex);
    return matches ? matches.length : 0;
  }

  function extractUserId(mention) {
    return mention.match(/<@!?(\d+)>/)?.[1] ?? null;
  }
}
