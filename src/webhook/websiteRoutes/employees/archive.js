const express = require('express');

const { canManageMember } = require('../../../utils/discordMemberStatus');
const { extractBearerToken } = require('../notifications/cronNotifications');

const router = express.Router();

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidEmployeeArchivedPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return false;
  if (payload.event !== 'employee.archived') return false;
  if (typeof payload.version !== 'number') return false;
  if (!isNonEmptyString(payload.environment)) return false;
  if (!isNonEmptyString(payload.sent_at)) return false;
  if (payload.action !== 'kick') return false;
  if (!payload.employee || typeof payload.employee !== 'object') return false;
  if (!isNonEmptyString(payload.employee.id)) return false;
  if (!isNonEmptyString(payload.employee.discord_user_id)) return false;
  if (!isNonEmptyString(payload.employee.email)) return false;
  if (!payload.archival || typeof payload.archival !== 'object') return false;
  if (!isNonEmptyString(payload.archival.date)) return false;
  if (!isNonEmptyString(payload.archival.reason_label)) return false;

  return true;
}

function resolveConfiguredGuildId() {
  return process.env.node_env === 'prod' ? process.env.prodGuildId : process.env.testGuildId;
}

async function resolveGuild(clientInstance, guildId) {
  if (!guildId) return null;

  let guild = clientInstance.guilds?.cache?.get?.(guildId);

  if (!guild && typeof clientInstance.guilds?.fetch === 'function') {
    guild = await clientInstance.guilds.fetch(guildId);
  }

  return guild || null;
}

async function resolveGuildMember(guild, userId) {
  let member = guild.members?.cache?.get?.(userId);

  if (!member && typeof guild.members?.fetch === 'function') {
    member = await guild.members.fetch(userId);
  }

  return member || null;
}

function buildArchivedEmployeeKickReason(payload) {
  const email = payload.employee.email.trim();
  const reasonLabel = payload.archival.reason_label.trim();

  return `Employee archived: ${reasonLabel} (${email})`;
}

async function kickArchivedEmployee({ clientInstance, guildId, payload }) {
  const guild = await resolveGuild(clientInstance, guildId);

  if (!guild) {
    throw new Error(`Discord guild ${guildId || 'unknown'} not configured`);
  }

  const discordUserId = payload.employee.discord_user_id;
  const member = await resolveGuildMember(guild, discordUserId);

  if (!member) {
    return { kicked: false, reason: 'not-found' };
  }

  const manageCheck = canManageMember(member);

  if (!manageCheck.ok) {
    console.info(`Skipping archived employee kick for ${discordUserId}: ${manageCheck.reason}`);
    return { kicked: false, reason: manageCheck.reason };
  }

  if (typeof member.kick !== 'function') {
    throw new Error(`Discord member ${discordUserId} cannot be kicked`);
  }

  await member.kick(buildArchivedEmployeeKickReason(payload));

  return { kicked: true };
}

function createEmployeeArchivedHandler({
  clientInstance,
  expectedToken = process.env.prodToken,
  guildId = resolveConfiguredGuildId(),
} = {}) {
  return async (req, res) => {
    try {
      const authHeader = req.get ? req.get('authorization') : req.headers?.authorization;
      const providedToken = extractBearerToken(authHeader);

      if (!providedToken || !expectedToken || providedToken !== expectedToken) {
        return res.status(401).json({ ok: false, message: 'Unauthorized' });
      }

      if (!isValidEmployeeArchivedPayload(req.body)) {
        return res.status(400).json({ ok: false, message: 'Invalid payload' });
      }

      const resolvedClient = clientInstance || require('../../../index.js');
      const result = await kickArchivedEmployee({
        clientInstance: resolvedClient,
        guildId,
        payload: req.body,
      });

      return res.status(200).json({
        ok: true,
        discord_user_id: req.body.employee.discord_user_id,
        kicked: result.kicked,
        ...(result.reason ? { reason: result.reason } : {}),
      });
    } catch (error) {
      console.error('Employee archived webhook error:', error);
      return res.status(500).json({ ok: false, message: 'Failed to kick archived employee' });
    }
  };
}

router.post('/archive', createEmployeeArchivedHandler());

module.exports = router;
module.exports.buildArchivedEmployeeKickReason = buildArchivedEmployeeKickReason;
module.exports.createEmployeeArchivedHandler = createEmployeeArchivedHandler;
module.exports.isValidEmployeeArchivedPayload = isValidEmployeeArchivedPayload;
module.exports.kickArchivedEmployee = kickArchivedEmployee;
module.exports.resolveGuild = resolveGuild;
module.exports.resolveGuildMember = resolveGuildMember;
