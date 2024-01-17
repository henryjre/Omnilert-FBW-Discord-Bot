const { EmbedBuilder } = require("discord.js");
const schedule = require("node-schedule");

let scheduledChecks = {};
module.exports = {
  data: {
    name: "announcementModal",
  },
  async execute(interaction, client) {
    const channel = interaction.fields.getTextInputValue("channelInput");

    if (!["1197101506638381188", "1197101565421568082"].includes(channel)) {
      await interaction.reply({
        content: `🔴 ERROR: Cannot find announcement channel. Please do not change the announcement type input.`,
        ephemeral: true,
      });
      return;
    }

    const title = interaction.fields.getTextInputValue("titleInput");
    const details = interaction.fields.getTextInputValue("announcementInput");

    await interaction.deferReply({ ephemeral: true });

    const role = interaction.guild.roles.cache.get(
      channel === "1197101506638381188"
        ? "1185935514042388520"
        : "1196806310524629062"
    );

    const embed = new EmbedBuilder()
      .setDescription(
        `## Announcement Submitted\nPlease check the <#${channel}> to check your announcement.`
      )
      .setColor("Green");

    const announcementEmbed = new EmbedBuilder()
      .setDescription(`## 📢 ANNOUNCEMENT`)
      .addFields([
        {
          name: "Title",
          value: title,
        },
        {
          name: "Announcement Details",
          value: details,
        },
      ])
      .setTimestamp(Date.now())
      .setFooter({
        iconURL: interaction.member.displayAvatarURL(),
        text: `Announced By: ${interaction.member.nickname}`,
      })
      .setColor(role.color);

    const proposalMessage = await client.channels.cache.get(channel).send({
      content: role.toString(),
      embeds: [announcementEmbed],
    });

    await interaction.editReply({
      embeds: [embed],
    });

    // function calculateDayCheck() {
    //   //   const nextSchedule = new Date(Date.now() + 24 * 60 * 60 * 1000);
    //   const nextSchedule = new Date(Date.now() + 10 * 1000);
    //   return nextSchedule;
    // }

    // scheduledChecks[proposalMessage.id] = schedule.scheduleJob(
    //   `ANNOUNCEMENT BY ${interaction.member.nickname}`,
    //   calculateDayCheck(),
    //   () => {
    //     checkReactions();
    //   }
    // );

    // async function checkReactions() {
    //   const message = await proposalMessage.channel.messages.fetch(
    //     proposalMessage.id
    //   );

    //   message.reactions.cache.forEach(async (reaction) => {
    //     const usersMap = await reaction.users.cache.map((u) => u.id);
    //     console.log(usersMap);
    //   });
    // }
  },
};
