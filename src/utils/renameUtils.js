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

function buildRenamedNickname(member, requestedName) {
  // Strip any prefix the requester typed so `🟢 Jane` doesn't end up doubled.
  const cleanName = stripStatusPrefix((requestedName || '').trim());

  if (!cleanName) {
    return { ok: false, reason: 'empty' };
  }

  const currentNickname = member?.nickname || '';
  const currentPrefix = extractStatusPrefix(currentNickname);

  if (!currentPrefix) {
    if (countCharacters(cleanName) > DISCORD_NICKNAME_MAX_LENGTH) {
      return { ok: false, reason: 'too_long', maxNameLength: DISCORD_NICKNAME_MAX_LENGTH };
    }

    return { ok: true, nickname: cleanName };
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

  if (countCharacters(cleanName) > maxNameLength) {
    return { ok: false, reason: 'too_long', maxNameLength, statusPrefix: currentPrefix.trim() };
  }

  return { ok: true, nickname: `${assembledPrefix}${cleanName}` };
}

module.exports = {
  HUMAN_RESOURCE_ROLE_ID,
  DISCORD_NICKNAME_MAX_LENGTH,
  PREFIXED_NAME_MAX_LENGTH,
  buildRenamedNickname,
  countCharacters,
  extractStatusPrefix,
  isHumanResource,
  stripStatusPrefix,
};
