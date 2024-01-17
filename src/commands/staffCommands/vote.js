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
    )
    .addStringOption((option) =>
      option
        .setName("type")
        .setDescription("The voting type.")
        .setRequired(true)
        .addChoices(
          { name: "👑 Voting Rights", value: "votingRights" },
          { name: "💸 Performance-Based Rate", value: "pbr" }
        )
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

    const type = interaction.options.getString("type");
    const user = interaction.options.getUser("user");
    const member = interaction.guild.members.cache.get(user.id);

    let validRole;
    if (type === "votingRights") {
      validRole = "1196806310524629062";
    } else {
      validRole = "1185935514042388520";
    }

    if (!member.roles.cache.has(validRole)) {
      await interaction.reply({
        content: `🔴 ERROR: ${member.nickname} is not an <@&${validRole}>.`,
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply();

    const buttonRow = new ActionRowBuilder();

    if (type === "votingRights") {
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

      buttonRow.addComponents(upvote, downvote, abstain);
    } else {
      const pbrButton = new ButtonBuilder()
        .setCustomId("votingPbrButton")
        .setLabel("Submit PBR")
        .setStyle(ButtonStyle.Success);

      buttonRow.addComponents(pbrButton);
    }

    const closeVote = new ButtonBuilder()
      .setCustomId("votingRightsClose")
      .setLabel("Close Voting")
      .setStyle(ButtonStyle.Primary);

    buttonRow.addComponents(closeVote);

    const votingRightsEmbed = new EmbedBuilder().setTimestamp(Date.now());

    if (type === "votingRights") {
      votingRightsEmbed
        .setTitle(`🗳️ VOTING RIGHTS`)
        .addFields([
          {
            name: "Member",
            value: member.toString(),
          },
          {
            name: "Number of Votes",
            value: "0",
          },
        ])
        .setColor("Blurple");
    } else {
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

      votingRightsEmbed
        .setTitle(`🗳️ PERFORMACE-BASED RATING`)
        .addFields([
          {
            name: "Member",
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
        .setColor("Orange");
    }

    await interaction.editReply({
      embeds: [votingRightsEmbed],
      components: [buttonRow],
    });
  },
};
