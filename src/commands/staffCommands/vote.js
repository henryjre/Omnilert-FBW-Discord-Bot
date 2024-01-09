const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");

const { GoogleSpreadsheet } = require("google-spreadsheet");
const creds = require("../../secret-key.json");
const moment = require("moment");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("vote")
    .setDescription(
      "Start a voting session for the voting rights of a core member."
    )
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The core member to be voted.")
        .setRequired(true)
    ),

  async execute(interaction, client) {
    const validRoles = ["1185935514042388520"];

    if (
      !interaction.member.roles.cache.some((r) => validRoles.includes(r.id))
    ) {
      await interaction.reply({
        content: `🔴 ERROR: This command can only be used by <@&1185935514042388520>.`,
        ephemeral: true,
      });
      return;
    }

    const user = interaction.options.getUser("user");
    const member = interaction.guild.members.cache.get(user.id);

    if (!member.roles.cache.has("1185935514042388520")) {
      await interaction.reply({
        content: `🔴 ERROR: ${member.nickname} is not a <@&1185935514042388520> member.`,
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply();

    const upvote = new ButtonBuilder()
      .setCustomId("votingRightsUpvote")
      .setLabel("Upvote")
      .setStyle(ButtonStyle.Success);

    const downvote = new ButtonBuilder()
      .setCustomId("votingRightsDownvote")
      .setLabel("Downvote")
      .setStyle(ButtonStyle.Danger);

    const abstain = new ButtonBuilder()
      .setCustomId("votingRightsAbstain")
      .setLabel("Abstain")
      .setStyle(ButtonStyle.Secondary);

    const closeVote = new ButtonBuilder()
      .setCustomId("votingRightsClose")
      .setLabel("Close Voting")
      .setStyle(ButtonStyle.Primary);

    const buttonRow = new ActionRowBuilder().addComponents(
      upvote,
      downvote,
      abstain,
      closeVote
    );

    const doc = new GoogleSpreadsheet(process.env.sheetId);
    await doc.useServiceAccountAuth(creds);
    await doc.loadInfo();
    const logSheet = doc.sheetsByTitle["LOGS"];

    const daysUntilPreviousSaturday = (moment().day() + 7 - 6) % 7;
    const previousSaturday = moment()
      .subtract(daysUntilPreviousSaturday, "days")
      .subtract(1, "week")
      .startOf("day");
    const previousFriday = previousSaturday
      .clone()
      .add(1, "week")
      .subtract(1, "days")
      .endOf("day");

    const rows = await logSheet.getRows();

    const filteredRows = rows
      .filter(
        (r) =>
          r._rawData[1] === user.username &&
          moment(r._rawData[3], "MMM D, YYYY, h:mm A").isSameOrAfter(
            previousSaturday
          ) &&
          moment(r._rawData[3], "MMM D, YYYY, h:mm A").isSameOrBefore(
            previousFriday
          )
      )
      .map((r) => r._rawData[4]);

    const totalSum = filteredRows.reduce(
      (accumulator, currentValue) => accumulator + Number(currentValue),
      0
    );

    const embedHours = Math.floor(totalSum / 60);
    const embedMinutes = totalSum % 60;

    const votingRightsEmbed = new EmbedBuilder()
      .setTitle(`🗳️ VOTING RIGHTS`)
      .addFields([
        {
          name: "Core Member",
          value: member.toString(),
        },
        {
          name: `Hours Rendered`,
          value: `${embedHours} hours and ${embedMinutes} minutes`,
        },
        {
          name: "Number of Votes",
          value: "0",
        },
      ])
      .setTimestamp(Date.now())
      .setColor("Blurple");

    await interaction.editReply({
      embeds: [votingRightsEmbed],
      components: [buttonRow],
    });
  },
};
