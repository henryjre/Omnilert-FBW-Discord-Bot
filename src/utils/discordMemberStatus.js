function buildStatusNickname(member, statusEmoji) {
  const currentNickname = member.nickname || member.user.username;

  if (currentNickname.includes('🟢')) {
    return currentNickname.replace('🟢', statusEmoji);
  }

  if (currentNickname.includes('🔴')) {
    return currentNickname.replace('🔴', statusEmoji);
  }

  if (!currentNickname.startsWith(statusEmoji)) {
    return `${statusEmoji} ${currentNickname}`;
  }

  return currentNickname;
}

function canManageMember(member) {
  if (!member) return { ok: false, reason: 'member not found' };
  if (member.guild?.ownerId === member.id) return { ok: false, reason: 'server owner' };
  if (member.manageable === false) return { ok: false, reason: 'role hierarchy' };

  return { ok: true };
}

async function setAttendanceStatusNickname(member, statusEmoji) {
  const manageCheck = canManageMember(member);

  if (!manageCheck.ok) {
    console.info(`Skipping attendance nickname update for ${member?.id || 'unknown user'}: ${manageCheck.reason}`);
    return { updated: false, reason: manageCheck.reason };
  }

  const nextNickname = buildStatusNickname(member, statusEmoji);
  return setManageableMemberNickname(member, nextNickname);
}

async function setManageableMemberNickname(member, nickname) {
  const manageCheck = canManageMember(member);

  if (!manageCheck.ok) {
    console.info(`Skipping nickname update for ${member?.id || 'unknown user'}: ${manageCheck.reason}`);
    return { updated: false, reason: manageCheck.reason };
  }

  await member.setNickname(nickname);

  return { updated: true, nickname };
}

async function syncManageableMemberRoles(member, rolesToRemove, roleToAdd) {
  const manageCheck = canManageMember(member);

  if (!manageCheck.ok) {
    console.info(`Skipping attendance role update for ${member?.id || 'unknown user'}: ${manageCheck.reason}`);
    return { updated: false, reason: manageCheck.reason };
  }

  if (rolesToRemove?.length) {
    await member.roles.remove(rolesToRemove);
  }

  if (roleToAdd) {
    await member.roles.add(roleToAdd);
  }

  return { updated: true };
}

module.exports = {
  buildStatusNickname,
  canManageMember,
  setAttendanceStatusNickname,
  setManageableMemberNickname,
  syncManageableMemberRoles,
};
