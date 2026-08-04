const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MediaGalleryBuilder,
  MessageFlags,
  RoleSelectMenuBuilder,
  SeparatorSpacingSize,
} = require('discord.js');

const PORTAL_ANNOUNCER_ROLE_ID = '1314815091908022373';
const PORTAL_ANNOUNCEMENT_CHANNEL_ID = '1526553793238532198';
const PORTAL_QUESTION_THREAD_TITLE = '❓ QUESTIONS HERE';
const PORTAL_MESSAGE_LIMIT = 2000;
const PORTAL_ATTACHMENT_THREAD_PREFIX = 'Portal Announcement Upload -';

const PORTAL_RECIPIENT_LIMIT = 25;

function normalizeSelectedRecipients(values = []) {
  return [...new Set(values)]
    .filter((value) => value === '@everyone' || /^\d+$/.test(value))
    .slice(0, PORTAL_RECIPIENT_LIMIT);
}

// Discord renders every guild role in a RoleSelectMenu and offers no way to
// filter the list client-side, so unusable picks are rejected on selection.
function isAnnounceableRole(role, guild) {
  if (!role) return false;
  if (role.id === guild?.id) return false; // @everyone, offered as its own option
  if (role.managed) return false; // bot/integration/booster roles
  return role.mentionable;
}

function partitionRecipientsByRole(values = [], guild) {
  const allowed = [];
  const rejected = [];

  for (const value of normalizeSelectedRecipients(values)) {
    if (value === '@everyone') {
      allowed.push(value);
      continue;
    }

    const role = guild?.roles?.cache?.get(value);
    if (isAnnounceableRole(role, guild)) {
      allowed.push(value);
    } else {
      rejected.push({ id: value, name: role?.name || value, managed: Boolean(role?.managed) });
    }
  }

  return { allowed, rejected };
}

function formatRecipient(value) {
  if (value === '@everyone') return '@everyone';
  return `<@&${value}>`;
}

function formatRecipients(values = []) {
  const selected = normalizeSelectedRecipients(values);
  return selected.length > 0 ? selected.map(formatRecipient).join(' ') : 'None selected';
}

function buildPortalRecipientMenu(selectedRecipients = []) {
  const roleIds = normalizeSelectedRecipients(selectedRecipients).filter(
    (value) => value !== '@everyone'
  );

  return new RoleSelectMenuBuilder()
    .setCustomId('portalAnnouncementRecipients')
    .setPlaceholder('Select target role/s.')
    .setMinValues(0)
    .setMaxValues(PORTAL_RECIPIENT_LIMIT)
    .setDefaultRoles(roleIds);
}

// @everyone is the guild's default role, which Discord omits from role pickers.
function buildPortalEveryoneToggle(selectedRecipients = []) {
  const active = normalizeSelectedRecipients(selectedRecipients).includes('@everyone');

  return new ButtonBuilder()
    .setCustomId('portalAnnouncementEveryone')
    .setLabel(active ? '@everyone: ON' : '@everyone: OFF')
    .setStyle(active ? ButtonStyle.Success : ButtonStyle.Secondary);
}

function buildPortalPreviewPayload({
  announcement,
  ownerId,
  selectedRecipients = [],
  attachments = [],
}) {
  const safeAnnouncement = String(announcement || '').slice(0, PORTAL_MESSAGE_LIMIT);
  const selected = normalizeSelectedRecipients(selectedRecipients);
  const safeAttachments = Array.isArray(attachments) ? attachments : [];
  const mediaAttachments = safeAttachments.filter((attachment) =>
    attachment.contentType?.startsWith('image/') || attachment.contentType?.startsWith('video/')
  );

  const container = new ContainerBuilder()
    .setAccentColor(selected.length > 0 ? 0x2ecc71 : 0xf1c40f)
    .addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(
        [
          '## Portal Announcement Preview',
          `Prepared by: <@${ownerId}>`,
          '',
          '### Recipients',
          formatRecipients(selected),
          '',
          '### Message',
          safeAnnouncement,
        ].join('\n')
      )
    );

  if (safeAttachments.length > 0) {
    container
      .addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Large))
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          [
            '### Attachments',
            ...safeAttachments.map((attachment, index) => {
              const name = attachment.name || `Attachment ${index + 1}`;
              return `${index + 1}. ${name}`;
            }),
          ].join('\n')
        )
      );
  }

  if (mediaAttachments.length > 0) {
    const gallery = new MediaGalleryBuilder().addItems(
      ...mediaAttachments.slice(0, 10).map((attachment) => ({
        media: { url: attachment.url },
      }))
    );

    container.addMediaGalleryComponents(gallery);
  }

  const buttons = [
    buildPortalEveryoneToggle(selected),
    new ButtonBuilder()
      .setCustomId('portalAnnouncementEdit')
      .setLabel('Edit')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('portalAnnouncementAddAttachment')
      .setLabel('Add Attachment')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('portalAnnouncementCancel')
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Danger),
  ];

  if (selected.length > 0) {
    buttons.push(
      new ButtonBuilder()
        .setCustomId('portalAnnouncementSubmit')
        .setLabel('Announce')
        .setStyle(ButtonStyle.Success)
    );
  }

  container
    .addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Large))
    .addActionRowComponents((actionRow) =>
      actionRow.setComponents(buildPortalRecipientMenu(selected))
    )
    .addActionRowComponents((actionRow) => actionRow.setComponents(...buttons));

  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  };
}

function getTextDisplayContents(message) {
  const containers = message?.components || [];
  const contents = [];

  for (const container of containers) {
    for (const component of container.components || []) {
      const content = component.content ?? component.data?.content;
      if (typeof content === 'string') contents.push(content);
    }
  }

  return contents;
}

function parsePortalPreviewMessage(message) {
  const content = getTextDisplayContents(message).find((text) =>
    text.includes('## Portal Announcement Preview')
  );

  if (!content) {
    return { announcement: '', ownerId: null, selectedRecipients: [] };
  }

  const ownerId = content.match(/Prepared by:\s*<@!?(\d+)>/)?.[1] || null;
  const recipientsBlock =
    content.match(/### Recipients\n([\s\S]*?)\n\n### Message/)?.[1]?.trim() || '';
  const selectedRecipients = [];

  if (recipientsBlock.includes('@everyone')) selectedRecipients.push('@everyone');
  for (const match of recipientsBlock.matchAll(/<@&(\d+)>/g)) {
    selectedRecipients.push(match[1]);
  }

  const announcement = content.match(/### Message\n([\s\S]*)$/)?.[1] || '';

  return {
    announcement,
    ownerId,
    selectedRecipients: normalizeSelectedRecipients(selectedRecipients),
  };
}

function getPortalAttachmentThreadName(messageId) {
  return `${PORTAL_ATTACHMENT_THREAD_PREFIX} ${messageId}`;
}

function findPortalAttachmentThread(channel, messageId) {
  return channel?.threads?.cache?.find?.((thread) =>
    thread.name === getPortalAttachmentThreadName(messageId)
  );
}

function isSupportedPortalAttachment(attachment) {
  return (
    attachment.contentType?.startsWith('image/') ||
    attachment.contentType?.startsWith('video/') ||
    attachment.contentType === 'application/pdf'
  );
}

async function collectPortalThreadAttachments(thread) {
  if (!thread) return [];

  const messages = await thread.messages.fetch({ limit: 100 });
  const attachments = [];

  messages
    .filter((message) => !message.author?.bot)
    .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
    .forEach((message) => {
      message.attachments
        .filter(isSupportedPortalAttachment)
        .forEach((attachment) => {
          attachments.push({
            id: attachment.id,
            name: attachment.name,
            url: attachment.url,
            contentType: attachment.contentType,
          });
        });
    });

  return attachments;
}

async function rebuildPortalPreviewFromMessage(message) {
  const parsed = parsePortalPreviewMessage(message);
  const thread = findPortalAttachmentThread(message.channel, message.id);
  const attachments = await collectPortalThreadAttachments(thread);
  const payload = buildPortalPreviewPayload({ ...parsed, attachments });

  return message.edit(payload);
}

async function deletePortalAttachmentThreadForMessage(message, client) {
  const thread = findPortalAttachmentThread(message.channel, message.id);
  if (thread) await thread.delete();
}

function buildPortalFinalPayload({ announcement, selectedRecipients, attachments = [] }) {
  const selected = normalizeSelectedRecipients(selectedRecipients);
  const mentionLine = selected.map(formatRecipient).join(' ');
  const separator = mentionLine ? '\n\n' : '';
  const maxAnnouncementLength = Math.max(
    0,
    PORTAL_MESSAGE_LIMIT - mentionLine.length - separator.length
  );
  const safeAnnouncement = String(announcement || '').slice(0, maxAnnouncementLength);
  const content = [mentionLine, safeAnnouncement].filter(Boolean).join(separator);
  const roleIds = selected.filter((value) => value !== '@everyone');

  return {
    content,
    files: attachments.map((attachment) => attachment.url),
    allowedMentions: {
      parse: selected.includes('@everyone') ? ['everyone'] : [],
      roles: roleIds,
    },
  };
}

const portalAnnouncementUtils = {
  PORTAL_ANNOUNCER_ROLE_ID,
  PORTAL_ANNOUNCEMENT_CHANNEL_ID,
  PORTAL_MESSAGE_LIMIT,
  PORTAL_QUESTION_THREAD_TITLE,
  PORTAL_RECIPIENT_LIMIT,
  buildPortalFinalPayload,
  isAnnounceableRole,
  partitionRecipientsByRole,
  buildPortalPreviewPayload,
  collectPortalThreadAttachments,
  deletePortalAttachmentThreadForMessage,
  findPortalAttachmentThread,
  getPortalAttachmentThreadName,
  normalizeSelectedRecipients,
  parsePortalPreviewMessage,
  rebuildPortalPreviewFromMessage,
};

module.exports = Object.assign(() => portalAnnouncementUtils, portalAnnouncementUtils);
