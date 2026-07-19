const HUMAN_RESOURCE_ROLE_ID = '1314815153421680640';

// Discord caps nicknames at 32 characters. Members carry a 🔴/🟢 shift-status
// prefix that eats into that budget, leaving 29 characters for the name itself.
const DISCORD_NICKNAME_MAX_LENGTH = 32;
const PREFIXED_NAME_MAX_LENGTH = 29;

const STATUS_PREFIX_PATTERN = /^(?:🟢|🔴)\s*(?:\|\s*)?/u;

function isHumanResource(member) {
  return Boolean(member?.roles?.cache?.has(HUMAN_RESOURCE_ROLE_ID));
}

// Discord counts code points, so 🟢 costs 1 character and not the 2 UTF-16
// units that `.length` would report.
function countCharacters(value) {
  return [...value].length;
}

function extractStatusPrefix(nickname) {
  const match = nickname?.match(STATUS_PREFIX_PATTERN);
  return match ? match[0] : null;
}

function stripStatusPrefix(value) {
  return value.replace(STATUS_PREFIX_PATTERN, '').trim();
}

// Single source of truth for how many characters a given member's name may use.
// The modal's setMaxLength and the server-side check both read from this so the
// figure shown to the user can never drift from the one enforced.
function buildRenameBudget(member) {
  const currentPrefix = extractStatusPrefix(member?.nickname || '');

  if (!currentPrefix) {
    return { maxNameLength: DISCORD_NICKNAME_MAX_LENGTH, assembledPrefix: '', statusPrefix: null };
  }

  // Normalize the prefix to a single trailing space unless it uses the `🟢 | `
  // separator variant, which departmentVoiceUtils.js still produces.
  const assembledPrefix = currentPrefix.includes('|')
    ? `${currentPrefix.trimEnd()} `
    : `${currentPrefix.trim()} `;

  const maxNameLength = Math.min(
    DISCORD_NICKNAME_MAX_LENGTH - countCharacters(assembledPrefix),
    PREFIXED_NAME_MAX_LENGTH
  );

  return { maxNameLength, assembledPrefix, statusPrefix: currentPrefix.trim() };
}

function buildRenamedNickname(member, requestedName) {
  // Strip any prefix the requester typed so `🟢 Jane` doesn't end up doubled.
  const cleanName = stripStatusPrefix((requestedName || '').trim());

  if (!cleanName) {
    return { ok: false, reason: 'empty' };
  }

  const { maxNameLength, assembledPrefix, statusPrefix } = buildRenameBudget(member);

  if (countCharacters(cleanName) > maxNameLength) {
    return { ok: false, reason: 'too_long', maxNameLength, statusPrefix };
  }

  return { ok: true, nickname: `${assembledPrefix}${cleanName}` };
}

const RENAME_MODAL_NAME = 'renameEmployeeModal';
const RENAME_MODAL_PREFIX = `${RENAME_MODAL_NAME}:`;

function buildRenameModalCustomId(memberId) {
  return `${RENAME_MODAL_PREFIX}${memberId}`;
}

function parseRenameModalCustomId(customId) {
  if (!customId?.startsWith(RENAME_MODAL_PREFIX)) return null;
  return customId.slice(RENAME_MODAL_PREFIX.length) || null;
}

module.exports = {
  HUMAN_RESOURCE_ROLE_ID,
  DISCORD_NICKNAME_MAX_LENGTH,
  PREFIXED_NAME_MAX_LENGTH,
  RENAME_MODAL_NAME,
  RENAME_MODAL_PREFIX,
  buildRenameBudget,
  buildRenameModalCustomId,
  buildRenamedNickname,
  countCharacters,
  extractStatusPrefix,
  isHumanResource,
  parseRenameModalCustomId,
  stripStatusPrefix,
};
