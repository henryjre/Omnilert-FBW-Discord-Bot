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

    if (!messageEmbed.data.description.includes("General")) {
      channelPermissions.push({
        id: interaction.guild.roles.everyone, // deny everyone
        deny: [PermissionFlagsBits.Connect, PermissionFlagsBits.ViewChannel],
      });
    }

    if (messageEmbed.data.description.includes("Management")) {
      if (participantsField.value === "All management members.") {
        channelPermissions.push({
          id: "1314413671245676685", // management role
          allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.ViewChannel],
        });

        mentionableParticipants = `<@&1314413671245676685>`;
      }
    } else if (messageEmbed.data.description.includes("Service Crew")) {
      if (participantsField.value === "All service crew members.") {
        channelPermissions.push({
          id: "1314413960274907238", // service crew role
          allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.ViewChannel],
        });

        mentionableParticipants = `${interaction.user.toString()} <@&1314413960274907238>`;
      }
    } else if (messageEmbed.data.description.includes("General")) {
      channelPermissions.push({
        id: interaction.guild.roles.everyone, // allow everyone
        allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.ViewChannel],
      });

      mentionableParticipants = `@everyone`;
    }

    if (!participantsField.value.includes("All")) {
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

    const event = await interaction.guild.scheduledEvents.create({
      name: `Meeting: ${channelName} ${channelCount}`,
      description: agendaField.value,
      scheduledStartTime: channelDate, // Date object
      privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
      channel: meetingChannel.id, // must be a valid voice/stage channel ID
      entityType: GuildScheduledEventEntityType.Voice,
    });

    const submit = new ButtonBuilder()
      .setCustomId("meetingStart")
      .setLabel("Start")
      .setStyle(ButtonStyle.Success);

    const cancel = new ButtonBuilder()
      .setCustomId("meetingEnd")
      .setDisabled(true)
      .setLabel("End")
      .setStyle(ButtonStyle.Danger);

    const buttonRow = new ActionRowBuilder().addComponents(submit, cancel);

    const meetingMessage = await client.channels.cache
      .get("1414611033816825856") // meeting logs channel
      .send({
        content: `Meeting ID: ${event.id}\n\n${mentionableParticipants}`,
        embeds: allEmbeds,
        components: [buttonRow],
      });

    await interaction.editReply({
      content: `✅ Meeting event created successfully.`,
      flags: MessageFlags.Ephemeral,
    });

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
