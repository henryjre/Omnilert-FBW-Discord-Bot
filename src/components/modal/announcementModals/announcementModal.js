const {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  StringSelectMenuOptionBuilder,
  StringSelectMenuBuilder,
  UserSelectMenuBuilder,
} = require("discord.js");
// // const schedule = require("node-schedule");

const managementRole = "1314413671245676685";
const serviceCrewRole = "1314413960274907238";
const jasaRole = "1336991998791385129";
const primarkRole = "1336992011525558312";
const robinsonRole = "1336992014545190933";
const dhvsuRole = "1336992007910068225";

let scheduledChecks = {};
module.exports = {
  data: {
    name: "announcementModal",
  },
  async execute(interaction, client) {
    const channel = "855644300410486796";

    const title = interaction.fields.getTextInputValue("titleInput");
    const details = interaction.fields.getTextInputValue("announcementInput");

    await interaction.deferReply();

    // const embed = new EmbedBuilder()
    //   .setDescription(
    //     `## Announcement Submitted\nPlease check the <#${channel}> to check your announcement.`
    //   )
    //   .setColor("Green");

    const announcementEmbed = new EmbedBuilder()
      .setDescription(
        `# 📢 ANNOUNCEMENT\n## *${title}*\n\u200b\n${details}\n\u200b`
      )
      .addFields([
        {
          name: "Prepared By",
          value: interaction.user.toString(),
        },
        // {
        //   name: "Announcement Details",
        //   value: details,
        // },
      ])
      // .setTimestamp(Date.now())
      // .setThumbnail(interaction.member.displayAvatarURL())
      .setFooter({
        iconURL: interaction.user.displayAvatarURL(),
        text: `If you are notified by this announcement, please acknowledge by reacting.`,
      })
      .setColor("Blurple");

    const roleMenu = new StringSelectMenuBuilder()
      .setCustomId("announcementMenu")
      .setOptions([
        new StringSelectMenuOptionBuilder()
          .setLabel("Everyone")
          .setValue("@everyone"),
        new StringSelectMenuOptionBuilder()
          .setLabel("Management")
          .setValue(managementRole),
        new StringSelectMenuOptionBuilder()
          .setLabel("Service Crew/Employees")
          .setValue(serviceCrewRole),
        new StringSelectMenuOptionBuilder()
          .setLabel("JASA Employees")
          .setValue(jasaRole),
        new StringSelectMenuOptionBuilder()
          .setLabel("Primark Employees")
          .setValue(primarkRole),
        new StringSelectMenuOptionBuilder()
          .setLabel("Robinsons Employees")
          .setValue(robinsonRole),
        new StringSelectMenuOptionBuilder()
          .setLabel("DHVSU Employees")
          .setValue(dhvsuRole),
      ])
      .setMinValues(1)
      .setMaxValues(1)
      .setPlaceholder("Select target role/s.");

    const submit = new ButtonBuilder()
      .setCustomId("announcementSubmit")
      .setLabel("Announce")
      .setDisabled(true)
      .setStyle(ButtonStyle.Success);

    const edit = new ButtonBuilder()
      .setCustomId("announcementEdit")
      .setLabel("Edit Details")
      .setStyle(ButtonStyle.Secondary);

    const addAttachment = new ButtonBuilder()
      .setCustomId("announcementAddAttachment")
      .setLabel("Add Attachments")
      .setStyle(ButtonStyle.Primary);

    const cancel = new ButtonBuilder()
      .setCustomId("announcementCancel")
      .setLabel("Cancel")
      .setStyle(ButtonStyle.Danger);

    const menuRow = new ActionRowBuilder().addComponents(roleMenu);
    const buttonRow = new ActionRowBuilder().addComponents(
      submit,
      addAttachment,
      cancel
    );

    // const proposalMessage = await client.channels.cache.get(channel).send({
    //   content: role.toString(),
    //   embeds: [announcementEmbed],
    // });

    await interaction.editReply({
      embeds: [announcementEmbed],
      components: [menuRow, buttonRow],
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
