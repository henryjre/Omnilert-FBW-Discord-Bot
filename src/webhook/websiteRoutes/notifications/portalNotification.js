const express = require("express");
const {
  ContainerBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");

const { extractBearerToken } = require("./cronNotifications");

const router = express.Router();

const PORTAL_DM_FALLBACK_CHANNEL_ID = "1337029532921888840";

// Discord error codes raised when the bot cannot DM the user:
//   50007  - user has DMs disabled / blocks the bot
//   50278  - no mutual guilds (DMs closed to non-mutual members)
const DISCORD_CANNOT_DM_USER_CODES = [50007, 50278];

// Default accent color when the payload does not provide a valid one.
const COLOR_DEFAULT = 0x5865f2; // blurple

// Accent color applied to a notification once it has been read (the user
// clicked "Open in Portal"). Greys the embed out to signal "seen".
const COLOR_READ = 0x95a5a6; // muted grey

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

// Parse a "#RRGGBB" hex string into an integer Discord accent color.
// Falls back to COLOR_DEFAULT when the value is missing or malformed.
function hexToInt(color) {
  if (!isNonEmptyString(color)) return COLOR_DEFAULT;

  const match = /^#?([0-9a-fA-F]{6})$/.exec(color.trim());
  if (!match) return COLOR_DEFAULT;

  return parseInt(match[1], 16);
}

function toUnixSeconds(isoString) {
  const ms = Date.parse(toDisplay(isoString));
  if (!Number.isFinite(ms)) return null;

  return Math.floor(ms / 1000);
}

// Builds the URL the "Open in Portal" button points at. When PUBLIC_BASE_URL
// is configured, the button routes through our own server first
// (`/website/notifications/portal/open/:id`) so we can mark the notification
// read and recolor the embed before redirecting the user to the real portal
// link. When the base URL is unset (local/dev), we fall back to linking the
// raw portal URL directly so nothing breaks.
function buildOpenInPortalUrl(notification, baseUrl) {
  const linkUrl = notification.link_url;
  if (!isValidHttpsUrl(linkUrl)) return null;

  const trimmedBase = isNonEmptyString(baseUrl) ? baseUrl.trim() : "";
  if (!trimmedBase) return linkUrl;

  const base = trimmedBase.replace(/\/+$/, "");
  return `${base}/website/notifications/portal/open/${encodeURIComponent(
    notification.id,
  )}`;
}

// Builds the classic-embed portal notification message. The notification
// message text is sent as the plain `content` by the caller; this returns the
// embed (title + timestamp + accent color) and the action row (Open in Portal).
// Classic embeds are used here so the message content can ride alongside the
// embed (Components V2 forbids the `content` field).
//
// `status` controls the accent color: a read notification is greyed out.
// `baseUrl` routes the "Open in Portal" button through our server so the click
// can mark the notification read (see buildOpenInPortalUrl).
function buildPortalNotificationMessage(
  payload,
  { status = "unread", baseUrl = process.env.PUBLIC_BASE_URL } = {},
) {
  const notification = payload.notification || {};
  const accentColor =
    status === "read" ? COLOR_READ : hexToInt(notification.color);

  const createdAtUnix = toUnixSeconds(notification.created_at);
  const timestampLine = createdAtUnix
    ? `<t:${createdAtUnix}:R>`
    : toDisplay(notification.created_at);

  const embed = new EmbedBuilder()
    .setColor(accentColor)
    .setDescription(`## 🔔 ${toDisplay(notification.title)}`)
    .addFields({ name: "Received", value: timestampLine });

  const actionButtons = [];

  const openUrl = buildOpenInPortalUrl(notification, baseUrl);
  if (openUrl) {
    actionButtons.push(
      new ButtonBuilder()
        .setLabel("Open in Portal")
        .setStyle(ButtonStyle.Link)
        .setURL(openUrl),
    );
  }

  const components =
    actionButtons.length > 0
      ? [new ActionRowBuilder().setComponents(...actionButtons)]
      : [];

  return { embeds: [embed], components };
}

function buildDmDisabledContainer(payload) {
  const discordUserId = payload.recipient.discord_user_id;
  const notification = payload.notification || {};

  const steps = [
    `## 📬 You have a new Portal notification`,
    "",
    `<@${discordUserId}>, I tried to DM you **"${toDisplay(notification.title)}"** ` +
      `but your server **Allow Direct Messages** setting is turned off, so I couldn't reach you privately.`,
    "",
    "### How to enable Direct Messages",
    "1. Click on the server name: **Omnilert**.",
    "2. Enable **Allow Direct Messages**.",
    "3. Once enabled, future Portal notifications will arrive in your Private Message/DMs.",
  ];

  const container = new ContainerBuilder()
    .setAccentColor(COLOR_DEFAULT)
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
      title, message, type, color, link_url, status, created_at, last_updated
    ) VALUES (
      @notification_id, @recipient_user_id, @discord_user_id,
      @title, @message, @type, @color, @link_url, 'unread', @created_at, datetime('now')
    )
    ON CONFLICT(notification_id) DO UPDATE SET
      recipient_user_id = excluded.recipient_user_id,
      discord_user_id = excluded.discord_user_id,
      title = excluded.title,
      message = excluded.message,
      type = excluded.type,
      color = excluded.color,
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
    color: notification.color ?? null,
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

// Edits the already-sent DM message so its embed is recolored to the "read"
// grey. Fetches the channel + message via the live client and edits in place —
// editing the bot's own message needs no interaction. Best-effort: any failure
// (message deleted, channel gone, etc.) is swallowed by the caller so the
// redirect still succeeds.
async function recolorMessageToRead(clientInstance, row) {
  if (!isNonEmptyString(row.dm_channel_id) || !isNonEmptyString(row.message_id))
    return;

  const channel = await resolveChannel(clientInstance, row.dm_channel_id);
  const message = await channel.messages.fetch(row.message_id);

  // Reconstruct the payload shape buildPortalNotificationMessage expects from
  // the stored row, then rebuild the message with read status (grey embed).
  const rebuilt = buildPortalNotificationMessage(
    {
      notification: {
        id: row.notification_id,
        title: row.title,
        color: row.color,
        link_url: row.link_url,
        created_at: row.created_at,
      },
    },
    { status: "read" },
  );

  await message.edit({ embeds: rebuilt.embeds, components: rebuilt.components });
}

function createPortalOpenHandler({ clientInstance, db } = {}) {
  return async (req, res) => {
    const resolvedClient = clientInstance || require("../../../index.js");
    const resolvedDb = db || require("../../../sqliteConnection.js");
    const notificationId = req.params.notificationId;

    let row;
    try {
      row = resolvedDb
        .prepare(
          `SELECT notification_id, dm_channel_id, message_id, status,
                  title, color, link_url, created_at
             FROM portal_notifications
            WHERE notification_id = ?`,
        )
        .get(notificationId);
    } catch (error) {
      console.error("Portal open lookup error:", error);
      row = null;
    }

    // Unknown id: nothing to redirect to. 404 rather than an open redirect.
    if (!row) {
      return res.status(404).send("Notification not found");
    }

    // Recolor + mark read only on the first open; subsequent clicks just
    // redirect. Failures here must not block the redirect to the portal.
    if (row.status !== "read") {
      try {
        await recolorMessageToRead(resolvedClient, row);
        setNotificationDelivery(resolvedDb, notificationId, {
          dmChannelId: row.dm_channel_id,
          messageId: row.message_id,
          status: "read",
        });
        await markReadOnPortal(notificationId);
      } catch (error) {
        console.error("Portal open recolor/mark-read error:", error);
      }
    }

    if (isValidHttpsUrl(row.link_url)) {
      return res.redirect(302, row.link_url);
    }

    // No valid portal link stored; acknowledge without redirecting.
    return res.status(200).send("Notification marked as read");
  };
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

      const notificationMessage = buildPortalNotificationMessage(payload);

      try {
        const user = await resolvedClient.users.fetch(discordUserId);
        const dm = await user.send({
          content: toDisplay(payload.notification.message),
          ...notificationMessage,
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
router.get("/portal/open/:notificationId", createPortalOpenHandler());

module.exports = router;
module.exports.PORTAL_DM_FALLBACK_CHANNEL_ID = PORTAL_DM_FALLBACK_CHANNEL_ID;
module.exports.createPortalNotificationHandler =
  createPortalNotificationHandler;
module.exports.createPortalOpenHandler = createPortalOpenHandler;
module.exports.recolorMessageToRead = recolorMessageToRead;
module.exports.buildOpenInPortalUrl = buildOpenInPortalUrl;
module.exports.isValidPortalNotificationPayload =
  isValidPortalNotificationPayload;
module.exports.buildPortalNotificationMessage =
  buildPortalNotificationMessage;
module.exports.buildDmDisabledContainer = buildDmDisabledContainer;
module.exports.sendDmDisabledFallback = sendDmDisabledFallback;
module.exports.markReadOnPortal = markReadOnPortal;
module.exports.deleteOnPortal = deleteOnPortal;
module.exports.isValidHttpsUrl = isValidHttpsUrl;
