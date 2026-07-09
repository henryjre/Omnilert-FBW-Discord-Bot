const express = require('express');
const { MessageFlags } = require('discord.js');
const {
  buildApprovedContainer,
  buildCompletedOnboardingThreadName,
  syncApprovedDiscordRoles,
} = require('../../../functions/helpers/onboardingUtils');
const { lookupApprovedUser } = require('../../../functions/helpers/onboardingApi');
const { extractBearerToken } = require('../notifications/cronNotifications');

const router = express.Router();
const ONBOARDING_PARENT_CHANNEL_ID = '1314413190074994689';
const MANAGEMENT_ROLE_ID = '1314413671245676685';
const SERVICE_CREW_ROLE_ID = '1314413960274907238';

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidRegistrationApprovedPayload(payload) {
  if (!payload || typeof payload !== 'object') return false;
  if (payload.event !== 'registration.approved') return false;
  if (!isNonEmptyString(payload.discord_user_id)) return false;
  if (!payload.user || typeof payload.user !== 'object') return false;
  if (!isNonEmptyString(payload.user.id)) return false;
  if (!isNonEmptyString(payload.user.email)) return false;
  if (!isNonEmptyString(payload.user.user_key)) return false;
  if (!Array.isArray(payload.roles)) return false;

  return payload.roles.every((role) => (
    role &&
    typeof role === 'object' &&
    isNonEmptyString(role.id) &&
    isNonEmptyString(role.name) &&
    isNonEmptyString(role.discord_role_id)
  ));
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

async function defaultOnboardingRoleRemovalScheduler(guildId, userId) {
  const { scheduleOnboardingRoleRemoval } = require('../../../queue/onboardingRoleRemovalQueue');
  return scheduleOnboardingRoleRemoval(guildId, userId);
}

function getFirstNameFromUser(user) {
  const rawName = user?.first_name || user?.firstName || user?.name || user?.email?.split('@')[0];
  if (!isNonEmptyString(rawName)) return null;

  return rawName.trim().split(/\s+/)[0];
}

function getRoleLabelForMember(member, roles = []) {
  const hasRole = (roleId) =>
    member.roles?.cache?.has?.(roleId) || roles.some((role) => role.discord_role_id === roleId);

  if (hasRole(SERVICE_CREW_ROLE_ID)) return 'Service Crew';
  if (hasRole(MANAGEMENT_ROLE_ID)) return 'Management';
  return null;
}

function buildApprovedMemberNickname(user, member, roles = []) {
  const firstName = getFirstNameFromUser(user);
  const roleLabel = getRoleLabelForMember(member, roles);

  if (!firstName || !roleLabel) return null;
  return `${firstName} - ${roleLabel}`;
}

async function renameApprovedMember(member, user, roles = []) {
  const nickname = buildApprovedMemberNickname(user, member, roles);
  if (!nickname || typeof member.setNickname !== 'function') {
    return { updated: false, nickname: null };
  }

  await member.setNickname(nickname);
  return { updated: true, nickname };
}

async function lookupApprovedUserForNickname(email, approvedUserLookup = lookupApprovedUser) {
  if (!isNonEmptyString(email) || typeof approvedUserLookup !== 'function') return null;

  const lookupResponse = await approvedUserLookup(email);
  return lookupResponse?.data?.user || null;
}

async function resolveChannel(clientInstance, channelId) {
  let channel = clientInstance.channels?.cache?.get?.(channelId);

  if (!channel && typeof clientInstance.channels?.fetch === 'function') {
    channel = await clientInstance.channels.fetch(channelId);
  }

  return channel || null;
}

async function findOnboardingThread(parentChannel, discordUserId) {
  const threadNameNeedle = `Onboarding | ${discordUserId} |`;

  const findThread = (threads) => {
    if (!threads) return null;
    if (typeof threads.find === 'function') {
      return threads.find((thread) => thread.name?.includes(threadNameNeedle)) || null;
    }

    for (const thread of threads.values?.() || []) {
      if (thread.name?.includes(threadNameNeedle)) return thread;
    }

    return null;
  };

  const findCachedThread = () => findThread(parentChannel.threads?.cache);

  let thread = findCachedThread();
  if (thread) return thread;

  if (typeof parentChannel.threads?.fetchActive === 'function') {
    await parentChannel.threads.fetchActive();
    thread = findCachedThread();
    if (thread) return thread;
  }

  if (typeof parentChannel.threads?.fetchArchived === 'function') {
    const archivedThreads = await parentChannel.threads.fetchArchived({ type: 'private' });
    thread = findThread(archivedThreads?.threads);
  }

  return thread || null;
}

async function markOnboardingThreadCompleted(clientInstance, channelId, discordUserId) {
  const parentChannel = await resolveChannel(clientInstance, channelId);
  if (!parentChannel) return false;

  const thread = await findOnboardingThread(parentChannel, discordUserId);
  if (!thread || typeof thread.setName !== 'function') return false;

  await thread.setName(buildCompletedOnboardingThreadName(thread.name));
  return true;
}

function componentHasVerificationAction(component) {
  if (!component) return false;

  const data = component.data || component;
  if (data.custom_id === 'verifyRegistrationButton') return true;
  if (data.label === 'Register') return true;

  const children = component.components || data.components || [];
  return children.some(componentHasVerificationAction);
}

function messageHasVerificationActions(message) {
  return Array.isArray(message?.components) && message.components.some(componentHasVerificationAction);
}

async function removeVerificationPromptMessages(thread, limit = 50) {
  if (typeof thread.messages?.fetch !== 'function') return 0;

  const messages = await thread.messages.fetch({ limit });
  let removedCount = 0;

  for (const message of messages.values?.() || []) {
    if (!messageHasVerificationActions(message)) continue;

    try {
      if (message.deletable === false) continue;
      await message.delete();
      removedCount += 1;
    } catch (error) {
      console.error('Failed to delete onboarding verification prompt:', error.message);
    }
  }

  return removedCount;
}

async function sendApprovedOnboardingMessage(thread) {
  if (typeof thread.send !== 'function') return false;

  await thread.send({
    components: [buildApprovedContainer()],
    flags: MessageFlags.IsComponentsV2,
  });

  return true;
}

async function completeOnboardingThread(clientInstance, channelId, discordUserId) {
  const parentChannel = await resolveChannel(clientInstance, channelId);
  if (!parentChannel) {
    return { marked: false, approvedMessageSent: false, removedPromptCount: 0 };
  }

  const thread = await findOnboardingThread(parentChannel, discordUserId);
  if (!thread) {
    return { marked: false, approvedMessageSent: false, removedPromptCount: 0 };
  }

  if (typeof thread.setName === 'function') {
    await thread.setName(buildCompletedOnboardingThreadName(thread.name));
  }

  const approvedMessageSent = await sendApprovedOnboardingMessage(thread);
  const removedPromptCount = await removeVerificationPromptMessages(thread);

  return { marked: true, approvedMessageSent, removedPromptCount };
}

function createRegistrationApprovedHandler({
  clientInstance,
  approvedUserLookup = lookupApprovedUser,
  expectedToken = process.env.prodToken,
  guildId = resolveConfiguredGuildId(),
  onboardingParentChannelId = ONBOARDING_PARENT_CHANNEL_ID,
  onboardingRoleRemovalScheduler = defaultOnboardingRoleRemovalScheduler,
} = {}) {
  return async (req, res) => {
    try {
      const authHeader = req.get ? req.get('authorization') : req.headers?.authorization;
      const providedToken = extractBearerToken(authHeader);

      if (!providedToken || !expectedToken || providedToken !== expectedToken) {
        return res.status(401).json({ ok: false, message: 'Unauthorized' });
      }

      if (!isValidRegistrationApprovedPayload(req.body)) {
        return res.status(400).json({ ok: false, message: 'Invalid payload' });
      }

      const resolvedClient = clientInstance || require('../../../index.js');
      const guild = await resolveGuild(resolvedClient, guildId);

      if (!guild) {
        return res.status(500).json({ ok: false, message: 'Discord guild not configured' });
      }

      const member = await resolveGuildMember(guild, req.body.discord_user_id);

      if (!member) {
        return res.status(404).json({ ok: false, message: 'Discord member not found' });
      }

      const syncResult = await syncApprovedDiscordRoles(member, req.body.roles);
      await onboardingRoleRemovalScheduler(guildId, req.body.discord_user_id);
      let nicknameResult = { updated: false, nickname: null };
      let onboardingThreadResult = {
        marked: false,
        approvedMessageSent: false,
        removedPromptCount: 0,
      };

      try {
        const lookupUser = await lookupApprovedUserForNickname(req.body.user.email, approvedUserLookup);
        nicknameResult = await renameApprovedMember(member, lookupUser || req.body.user, req.body.roles);
      } catch (error) {
        console.error('Failed to rename approved registration member:', error.message);
      }

      try {
        onboardingThreadResult = await completeOnboardingThread(
          resolvedClient,
          onboardingParentChannelId,
          req.body.discord_user_id
        );
      } catch (error) {
        console.error('Failed to mark onboarding thread from registration webhook:', error.message);
      }

      return res.status(200).json({
        ok: true,
        message: 'Registration approval roles synced',
        discord_user_id: req.body.discord_user_id,
        added_role_ids: syncResult.addedRoleIds,
        skipped_role_ids: syncResult.skippedRoleIds,
        nickname_updated: nicknameResult.updated,
        nickname: nicknameResult.nickname,
        onboarding_thread_marked: onboardingThreadResult.marked,
        approved_message_sent: onboardingThreadResult.approvedMessageSent,
        removed_verification_prompt_count: onboardingThreadResult.removedPromptCount,
      });
    } catch (error) {
      console.error('Registration approved webhook error:', error);
      return res.status(500).json({ ok: false, message: 'Failed to sync registration approval roles' });
    }
  };
}

router.post('/approved', createRegistrationApprovedHandler());

module.exports = router;
module.exports.completeOnboardingThread = completeOnboardingThread;
module.exports.buildApprovedMemberNickname = buildApprovedMemberNickname;
module.exports.componentHasVerificationAction = componentHasVerificationAction;
module.exports.createRegistrationApprovedHandler = createRegistrationApprovedHandler;
module.exports.findOnboardingThread = findOnboardingThread;
module.exports.getFirstNameFromUser = getFirstNameFromUser;
module.exports.getRoleLabelForMember = getRoleLabelForMember;
module.exports.isValidRegistrationApprovedPayload = isValidRegistrationApprovedPayload;
module.exports.lookupApprovedUserForNickname = lookupApprovedUserForNickname;
module.exports.markOnboardingThreadCompleted = markOnboardingThreadCompleted;
module.exports.messageHasVerificationActions = messageHasVerificationActions;
module.exports.renameApprovedMember = renameApprovedMember;
module.exports.removeVerificationPromptMessages = removeVerificationPromptMessages;
