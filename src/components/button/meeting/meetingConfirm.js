const {
  ActionRowBuilder,
  MessageFlags,
  EmbedBuilder,
  ButtonStyle,
  ButtonBuilder,
  ChannelType,
  GuildScheduledEventManager,
  PermissionFlagsBits,
  GuildScheduledEventPrivacyLevel,
  GuildScheduledEventEntityType,
  GuildScheduledEventStatus,
} = require("discord.js");

const moment = require("moment-timezone");

module.exports = {
  data: {
    name: `meetingConfirm`,
  },
  async execute(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const replyEmbed = new EmbedBuilder();

    let allEmbeds = interaction.message.embeds;
    const messageEmbed = allEmbeds[0];

    const authorField = messageEmbed.data.fields.find(
      (f) => f.name === "Created By"
    );
    const participantsField = messageEmbed.data.fields.find(
      (f) => f.name === "Participants"
    );
    const dateField = messageEmbed.data.fields.find(
      (f) => f.name === "Meeting Date"
    );
    const agendaField = messageEmbed.data.fields.find(
      (f) => f.name === "Meeting Agenda"
    );

    if (!authorField.value.includes(interaction.user.id)) {
      replyEmbed
        .setDescription(`🔴 ERROR: You cannot use this button.`)
        .setColor("Red");

      return await interaction.editReply({ embeds: [replyEmbed] });
    }

    const voiceChannelsCategoryId = "1314413190074994688";
    const channelsInCategory = interaction.guild.channels.cache.filter(
      (channel) => channel.parentId === voiceChannelsCategoryId
    );

    const channelCount = channelsInCategory.size - 2;
    const channelName = messageEmbed.data.description
      .replace(/## 📅/g, "")
      .trim()
      .replace(/([A-Z]+)/g, (match) => {
        // Convert UPPERCASE to Camel Case (first letter capital, rest lowercase)
        return match.charAt(0) + match.slice(1).toLowerCase();
      });
    const channelDate = parseDateTime(dateField.value);

    let channelPermissions = [
      {
        id: extractUserId(authorField.value),
        allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.ViewChannel],
      },
    ];
    let mentionableParticipants = "";

    if (!messageEmbed.data.description.toLowerCase().includes("general")) {
      channelPermissions.push({
        id: interaction.guild.roles.everyone, // deny everyone
        deny: [PermissionFlagsBits.Connect, PermissionFlagsBits.ViewChannel],
      });
    }

    if (messageEmbed.data.description.toLowerCase().includes("management")) {
      if (participantsField.value === "All management members.") {
        channelPermissions.push({
          id: "1314413671245676685", // management role
          allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.ViewChannel],
        });

        mentionableParticipants = `<@&1314413671245676685>`;
      }
    } else if (
      messageEmbed.data.description.toLowerCase().includes("service crew")
    ) {
      if (participantsField.value === "All service crew members.") {
        channelPermissions.push({
          id: "1314413960274907238", // service crew role
          allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.ViewChannel],
        });

        mentionableParticipants = `${interaction.user.toString()} <@&1314413960274907238>`;
      }
    } else if (
      messageEmbed.data.description.toLowerCase().includes("general")
    ) {
      channelPermissions.push({
        id: interaction.guild.roles.everyone, // allow everyone
        allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.ViewChannel],
      });

      mentionableParticipants = `@everyone`;
    }

    if (!participantsField.value.toLowerCase().includes("all")) {
      mentionableParticipants += `${interaction.user.toString()} `;

      for (const participant of participantsField.value.split("\n")) {
        const match = participant.match(/<@!?(\d+)>/); // extract ID
        if (!match) continue; // skip if line doesn’t match
        const userId = match[1];

        channelPermissions.push({
          id: userId,
          allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.ViewChannel],
        });

        mentionableParticipants += `<@${userId}> `;
      }
    }

    if (messageEmbed.data.footer) {
      messageEmbed.data.footer.text = `Join the event to be notified of this meeting.`;
    } else {
      messageEmbed.data.footer = {
        text: `Join the event to be notified of this meeting.`,
      };
    }

    const meetingChannel = await interaction.guild.channels.create({
      name: `🎙️・${channelName} ${channelCount}`,
      type: ChannelType.GuildVoice,
      parent: voiceChannelsCategoryId, // 👈 puts it under that category
      reason: `Created by ${authorField.value}`,
      permissionOverwrites: channelPermissions,
    });

    messageEmbed.data.fields.push({
      name: "Location",
      value: meetingChannel.toString(),
    });

    let event;

    try {
      event = await interaction.guild.scheduledEvents.create({
        name: `Meeting: ${channelName} ${channelCount}`,
        description: agendaField.value,
        scheduledStartTime: channelDate, // a JS Date in the future
        privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
        channel: meetingChannel.id,
        entityType: GuildScheduledEventEntityType.Voice,
      });
    } catch (error) {
      console.error("Create event failed:", error.rawError ?? error);

      const msg = JSON.stringify(error.rawError?.errors ?? {});
      if (msg.includes("GUILD_SCHEDULED_EVENT_SCHEDULE_PAST")) {
        if (meetingChannel) {
          await meetingChannel.delete(
            "Event creation failed - past start time"
          );
          console.error("Deleted voice channel after event creation failure");
        }

        replyEmbed
          .setDescription(`🔴 ERROR: The start time must be in the future.`)
          .setColor("Red");

        return await interaction.editReply({ embeds: [replyEmbed] });
      }

      if (meetingChannel) {
        await meetingChannel.delete("Event creation failed - general error");
        console.error("Deleted voice channel after event creation failure");
      }

      replyEmbed
        .setDescription(
          `🔴 ERROR: Failed to create the event. Please double-check the date/time.`
        )
        .setColor("Red");

      return await interaction.editReply({ embeds: [replyEmbed] });
    }

    const startMeeting = new ButtonBuilder()
      .setCustomId("meetingStart")
      .setLabel("Start")
      .setStyle(ButtonStyle.Success);

    // Add Meeting ID field at the first position of the fields array
    messageEmbed.data.fields.unshift({
      name: "Meeting ID",
      value: event.id,
    });

    const buttonRow = new ActionRowBuilder().addComponents(startMeeting);

    const meetingMessage = await client.channels.cache
      .get("1414611033816825856") // meeting logs channel
      .send({
        content: `Meeting ID: ${event.id}\n\n${mentionableParticipants}\n\n${event.url}`,
        embeds: allEmbeds,
        components: [buttonRow],
      });

    replyEmbed
      .setDescription(`✅ Meeting event created successfully.`)
      .setColor("Green");

    await interaction.editReply({ embeds: [replyEmbed] });

    await interaction.message.delete();
  },
};

function parseDateTime(dateTimeStr, timezone = "Asia/Manila") {
  const format = "MMMM D, YYYY [at] h:mm A";

  const m = moment.tz(dateTimeStr, format, true, timezone);

  if (!m.isValid()) {
    return null; // return null instead of throwing
  }

  return m.toDate();
}

function extractUserId(mention) {
  return mention.match(/<@!?(\d+)>/)?.[1] ?? null;
}
