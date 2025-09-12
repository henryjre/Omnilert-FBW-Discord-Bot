const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");

const meetingLogsChannelId = "1414611033816825856";

module.exports = {
  name: "guildScheduledEventUpdate",
  async execute(oldEvent, newEvent) {
    const meetingLogsChannel = await newEvent.guild.channels.cache.get(
      meetingLogsChannelId
    );

    try {
      const messages = await meetingLogsChannel.messages.fetch({ limit: 100 });

      const targetMessage = messages.find(
        (message) => message.content && message.content.includes(newEvent.id)
      );

      if (!targetMessage) return;

      const isActive = newEvent.isActive();

      let targetMessageEmbed = targetMessage.embeds[0];

      let buttonRow = [];

      if (isActive) {
        targetMessageEmbed.data.color = 5763719;
        targetMessageEmbed.data.footer.text = `This meeting is now ongoing.`;

        const endMeeting = new ButtonBuilder()
          .setCustomId("meetingEnd")
          .setDisabled(true)
          .setLabel("End")
          .setStyle(ButtonStyle.Danger);

        buttonRow.push(endMeeting);
      } else {
        targetMessageEmbed.data.color = 15548997;
        targetMessageEmbed.data.footer.text = `This meeting has ended.`;

        if (newEvent.channelId) {
          const voiceChannel = await newEvent.guild.channels.fetch(
            newEvent.channelId
          );
          if (voiceChannel) {
            await voiceChannel.delete(
              "Meeting has ended, cleaning up voice channel"
            );
            console.log(
              `Successfully deleted voice channel ${voiceChannel.name} (${newEvent.channelId})`
            );
          }
        }
      }

      await targetMessage.edit({
        embeds: [targetMessageEmbed],
        components: [buttonRow],
      });
    } catch (error) {
      console.error("Error while searching for event message:", error);
      return null;
    }
  },
};
