const {
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  GuildScheduledEventStatus,
  ChannelType,
  EmbedBuilder,
} = require("discord.js");

const meetingLogsChannelId = "1414611033816825856";

module.exports = {
  name: "guildScheduledEventUpdate",
  async execute(oldEvent, newEvent) {
    const meetingLogsChannel =
      newEvent.guild.channels.cache.get(meetingLogsChannelId);
    if (!meetingLogsChannel?.isTextBased()) return;

    try {
      const messages = await meetingLogsChannel.messages.fetch({ limit: 100 });

      const targetMessage = messages.find(
        (m) => m.content && m.content.includes(newEvent.id)
      );
      if (!targetMessage) return;

      const isActive = newEvent.status === GuildScheduledEventStatus.Active;
      const hasEnded = newEvent.status === GuildScheduledEventStatus.Completed;
      const hasCanceled =
        newEvent.status === GuildScheduledEventStatus.Canceled;

      // Build a fresh embed (don’t mutate APIEmbed)
      const base = targetMessage.embeds[0] ?? {};
      const embed = EmbedBuilder.from(base)
        .setColor(isActive ? "Green" : "Red")
        .setFooter({
          text: isActive
            ? "This meeting is now ongoing."
            : hasEnded
            ? "This meeting has ended."
            : hasCanceled
            ? "This meeting has been cancelled."
            : "This meeting is ongoing.",
        });

      if (hasEnded || hasCanceled) {
        const existingFields = targetMessage.embeds[0]?.fields ?? [];
        if (existingFields.length) {
          const filtered = existingFields.filter(
            (f) => (f.name ?? "").trim().toLowerCase() !== "location"
          );
          embed.setFields(filtered);
        }
      }

      const components = [];
      if (isActive) {
        const endMeeting = new ButtonBuilder()
          .setCustomId("meetingEnd")
          .setLabel("End")
          .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(endMeeting);
        components.push(row);
      }

      await targetMessage.edit({
        embeds: [embed],
        components, // [] if not active (no empty row)
      });

      // Clean up voice channel if ended
      if (hasEnded || (hasCanceled && newEvent.channelId)) {
        const voiceChannel = await newEvent.guild.channels
          .fetch(newEvent.channelId)
          .catch(() => null);
        if (voiceChannel?.type === ChannelType.GuildVoice) {
          await voiceChannel.delete(
            "Meeting has ended, cleaning up voice channel"
          );
          console.log(
            `Deleted voice channel ${voiceChannel.name} (${voiceChannel.id})`
          );
        }
      }
    } catch (error) {
      console.error("Error while searching for event message:", error);
    }
  },
};
