const express = require("express");
const {
  ContainerBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");

const { extractBearerToken } = require("./cronNotifications");

const router = express.Router();

const PORTAL_DM_FALLBACK_CHANNEL_ID = "1513405109655175168";

// Discord error codes raised when the bot cannot DM the user:
//   50007  - user has DMs disabled / blocks the bot
//   50278  - no mutual guilds (DMs closed to non-mutual members)
const DISCORD_CANNOT_DM_USER_CODES = [50007, 50278];

// Accent colors used as the visual read/unread distinction.
const COLOR_UNREAD = 0x5865f2; // blurple
const COLOR_READ = 0x99aab5; // muted grey

// SCREENSHOTS: drop image URLs here to render the "how to enable DMs" guide.
// Leave empty until the screenshots are ready.
const DM_GUIDE_SCREENSHOT_URLS = [
  "https://cdn.discordapp.com/attachments/1384688917155938354/1513461082671550604/Screenshot_2026-06-08-16-26-15-305_com.discord.jpg?ex=6a27cff8&is=6a267e78&hm=698e91481ac18f4da5837ed18de77bee0b36ccfe9c28d277f422317e1504913c&",
  "https://cdn.discordapp.com/attachments/1384688917155938354/1513461082403111032/Screenshot_2026-06-08-16-26-34-143_com.discord.jpg?ex=6a27cff8&is=6a267e78&hm=3057633a8932207a6ada9284a8782ca2136016c71753406beb022602ac6d6cf6&",
];

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function toDisplay(value) {
  if (value === null || value === undefined) return "N/A";

  const stringValue = String(value).trim();
  return stringValue.length === 0 ? "N/A" : stringValue;
}

function isValidHttpsUrl(value) {
  if (!isNonEmptyString(value)) return false;

  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidPortalNotificationPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload))
    return false;
  if (!isNonEmptyString(payload.event)) return false;
  if (typeof payload.version !== "number") return false;
  if (!payload.recipient || typeof payload.recipient !== "object") return false;
  if (!isNonEmptyString(payload.recipient.discord_user_id)) return false;
  if (!payload.notification || typeof payload.notification !== "object")
    return false;
  if (!isNonEmptyString(payload.notification.id)) return false;
  if (!isNonEmptyString(payload.notification.title)) return false;
  if (!isNonEmptyString(payload.notification.message)) return false;

  return true;
}

function toUnixSeconds(isoString) {
  const ms = Date.parse(toDisplay(isoString));
  if (!Number.isFinite(ms)) return null;

  return Math.floor(ms / 1000);
}

function buildPortalNotificationContainer(payload, { status = "unread" } = {}) {
  const notification = payload.notification || {};
  const isRead = status === "read";
  const accentColor = isRead ? COLOR_READ : COLOR_UNREAD;

  const createdAtUnix = toUnixSeconds(notification.created_at);
  const timestampLine = createdAtUnix
    ? `<t:${createdAtUnix}:R>`
    : toDisplay(notification.created_at);

  const bodyLines = [
    `## 🔔 ${toDisplay(notification.title)}`,
    "",
    toDisplay(notification.message),
    "",
    `**Received:** ${timestampLine}`,
    `**Status:** ${isRead ? "⚪ Read" : "🔵 Unread"}`,
  ];

  const container = new ContainerBuilder()
    .setAccentColor(accentColor)
    .addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(bodyLines.join("\n")),
    )
    .addSeparatorComponents((separator) => separator);

  const actionButtons = [];

  const linkUrl = notification.link_url;
  if (isValidHttpsUrl(linkUrl)) {
    actionButtons.push(
      new ButtonBuilder()
        .setLabel("Open in Portal")
        .setStyle(ButtonStyle.Link)
        .setURL(linkUrl),
    );
  }

  if (!isRead) {
    actionButtons.push(
      new ButtonBuilder()
        .setLabel("Mark as Read")
        .setStyle(ButtonStyle.Secondary)
        .setCustomId(`portalNotifRead_${notification.id}`),
    );
  }

  actionButtons.push(
    new ButtonBuilder()
      .setLabel("Delete")
      .setStyle(ButtonStyle.Danger)
      .setCustomId(`portalNotifDelete_${notification.id}`),
  );

  container.addActionRowComponents((row) =>
    row.setComponents(...actionButtons),
  );

  return container;
}

function buildDmDisabledContainer(payload) {
  const discordUserId = payload.recipient.discord_user_id;
  const notification = payload.notification || {};

  const steps = [
    `## 📬 You have a new Portal notification`,
    "",
    `<@${discordUserId}>, we tried to DM you **"${toDisplay(notification.title)}"** ` +
      `but your server **Allow Direct Messages** setting is turned off, so we couldn't reach you privately.`,
    "",
    "### How to enable Direct Messages",
    "1. Click on the server name: **Omnilert**.",
    "2. Enable **Allow Direct Messages**.",
    "3. Once enabled, future Portal notifications will arrive in your Private Message/DMs.",
  ];

  const container = new ContainerBuilder()
    .setAccentColor(COLOR_UNREAD)
    .addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(steps.join("\n")),
    );

  if (DM_GUIDE_SCREENSHOT_URLS.length > 0) {
    container.addMediaGalleryComponents((gallery) =>
      gallery.addItems(
        ...DM_GUIDE_SCREENSHOT_URLS.map((url) => ({ media: { url } })),
      ),
    );
  }

  return container;
}

async function resolveChannel(clientInstance, channelId) {
  let channel = clientInstance.channels?.cache?.get?.(channelId);

  if (!channel && typeof clientInstance.channels?.fetch === "function") {
    channel = await clientInstance.channels.fetch(channelId);
  }

  if (!channel || typeof channel.send !== "function") {
    throw new Error(`Discord channel ${channelId} not found or not sendable`);
  }

  return channel;
}

async function sendDmDisabledFallback(clientInstance, payload, channelId) {
  const channel = await resolveChannel(clientInstance, channelId);
  const container = buildDmDisabledContainer(payload);

  return channel.send({
    components: [container],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { users: [payload.recipient.discord_user_id], parse: [] },
  });
}

// --- Portal API sync stubs -------------------------------------------------
// TODO: POST to app.omnilert.com once the endpoint + auth spec is provided.
async function markReadOnPortal(notificationId) {
  // no-op until Portal API is wired up
  return { ok: true, notificationId };
}

// TODO: POST/DELETE to app.omnilert.com once the endpoint + auth spec is provided.
async function deleteOnPortal(notificationId) {
  // no-op until Portal API is wired up
  return { ok: true, notificationId };
}
// ---------------------------------------------------------------------------

function isCannotDmError(error) {
  if (!error) return false;

  return (
    DISCORD_CANNOT_DM_USER_CODES.includes(error.code) ||
    DISCORD_CANNOT_DM_USER_CODES.includes(error.rawError?.code)
  );
}

function upsertNotificationRow(db, payload) {
  const notification = payload.notification || {};

  db.prepare(
    `
    INSERT INTO portal_notifications (
      notification_id, recipient_user_id, discord_user_id,
      title, message, type, link_url, status, created_at, last_updated
    ) VALUES (
      @notification_id, @recipient_user_id, @discord_user_id,
      @title, @message, @type, @link_url, 'unread', @created_at, datetime('now')
    )
    ON CONFLICT(notification_id) DO UPDATE SET
      recipient_user_id = excluded.recipient_user_id,
      discord_user_id = excluded.discord_user_id,
      title = excluded.title,
      message = excluded.message,
      type = excluded.type,
      link_url = excluded.link_url,
      status = 'unread',
      created_at = excluded.created_at,
      last_updated = datetime('now')
  `,
  ).run({
    notification_id: notification.id,
    recipient_user_id: payload.recipient.user_id ?? null,
    discord_user_id: payload.recipient.discord_user_id,
    title: notification.title ?? null,
    message: notification.message ?? null,
    type: notification.type ?? null,
    link_url: isValidHttpsUrl(notification.link_url)
      ? notification.link_url
      : null,
    created_at: notification.created_at ?? null,
  });
}

function setNotificationDelivery(
  db,
  notificationId,
  { dmChannelId, messageId, status },
) {
  db.prepare(
    `
    UPDATE portal_notifications
    SET dm_channel_id = @dm_channel_id,
        message_id = @message_id,
        status = @status,
        last_updated = datetime('now')
    WHERE notification_id = @notification_id
  `,
  ).run({
    notification_id: notificationId,
    dm_channel_id: dmChannelId ?? null,
    message_id: messageId ?? null,
    status,
  });
}

function createPortalNotificationHandler({
  clientInstance,
  db,
  expectedToken = process.env.prodToken,
  dmFailChannelId = PORTAL_DM_FALLBACK_CHANNEL_ID,
} = {}) {
  return async (req, res) => {
    try {
      const authHeader = req.get
        ? req.get("authorization")
        : req.headers?.authorization;
      const providedToken = extractBearerToken(authHeader);

      if (!providedToken || !expectedToken || providedToken !== expectedToken) {
        return res.status(401).json({ ok: false, message: "Unauthorized" });
      }

      if (!isValidPortalNotificationPayload(req.body)) {
        return res.status(400).json({ ok: false, message: "Invalid payload" });
      }

      const payload = req.body;
      console.log(
        "Portal notification payload received:",
        JSON.stringify(payload, null, 2),
      );
      const resolvedClient = clientInstance || require("../../../index.js");
      const resolvedDb = db || require("../../../sqliteConnection.js");
      const notificationId = payload.notification.id;
      const discordUserId = payload.recipient.discord_user_id;

      upsertNotificationRow(resolvedDb, payload);

      const container = buildPortalNotificationContainer(payload, {
        status: "unread",
      });

      try {
        const user = await resolvedClient.users.fetch(discordUserId);
        const dm = await user.send({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
        });

        setNotificationDelivery(resolvedDb, notificationId, {
          dmChannelId: dm.channelId ?? dm.channel?.id ?? null,
          messageId: dm.id ?? null,
          status: "unread",
        });

        return res
          .status(200)
          .json({ ok: true, message: "Portal notification delivered via DM" });
      } catch (dmError) {
        if (!isCannotDmError(dmError)) throw dmError;

        await sendDmDisabledFallback(resolvedClient, payload, dmFailChannelId);
        setNotificationDelivery(resolvedDb, notificationId, {
          dmChannelId: null,
          messageId: null,
          status: "dm_failed",
        });

        return res.status(200).json({
          ok: true,
          message: "Recipient DMs disabled; posted fallback notice",
        });
      }
    } catch (error) {
      console.error("Portal notification webhook error:", error);
      return res
        .status(500)
        .json({ ok: false, message: "Failed to deliver portal notification" });
    }
  };
}

router.post("/portal", createPortalNotificationHandler());

module.exports = router;
module.exports.PORTAL_DM_FALLBACK_CHANNEL_ID = PORTAL_DM_FALLBACK_CHANNEL_ID;
module.exports.createPortalNotificationHandler =
  createPortalNotificationHandler;
module.exports.isValidPortalNotificationPayload =
  isValidPortalNotificationPayload;
module.exports.buildPortalNotificationContainer =
  buildPortalNotificationContainer;
module.exports.buildDmDisabledContainer = buildDmDisabledContainer;
module.exports.sendDmDisabledFallback = sendDmDisabledFallback;
module.exports.markReadOnPortal = markReadOnPortal;
module.exports.deleteOnPortal = deleteOnPortal;
module.exports.isValidHttpsUrl = isValidHttpsUrl;
