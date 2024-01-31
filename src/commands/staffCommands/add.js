const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const pool = require("../../sqlConnectionPool");
const moment = require("moment");

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

const departments = [
  {
    name: "Tiktok Account Management",
    executive: "752713584148086795",
    submember_role: "1187702183802720327",
  },
  {
    name: "Web Development Department",
    executive: "748568303219245117",
    submember_role: "1117440563361366147",
  },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("add")
    .setDescription("Add something...")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("pbr")
        .setDescription("Add PBR to a Sub-Member")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("The target Sub-Member.")
            .setRequired(true)
        )
        .addNumberOption((option) =>
          option
            .setName("pbr-value")
            .setDescription("The amount of PBR ranging from 1 - 30 PHP.")
            .setRequired(true)
            .setMaxValue(30)
            .setMinValue(1)
        )
    ),
  async execute(interaction, client) {
    const interactionMember = await interaction.guild.members.cache.get(
      interaction.user.id
    );
    if (!interactionMember.roles.cache.has("1185935514042388520")) {
      await interaction.reply({
        content: "🔴 ERROR: You cannot use this command.",
        ephemeral: true,
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case "pbr":
        addSubmemberPbr();
        break;

      default:
        break;
    }

    async function addSubmemberPbr() {
      await interaction.deferReply({ ephemeral: true });
      const user = interaction.options.getUser("user");
      const pbr = interaction.options.getNumber("pbr-value");

      const department = departments.find(
        (u) => u.executive === interaction.user.id
      );

      if (!department) {
        await interaction.editReply({
          content:
            "🔴 ERROR: Cannot add PBR to associates. You do not have an associate yet.",
        });
        return;
      }

      const userMember = await interaction.guild.members.cache.get(user.id);
      const role = await interaction.guild.roles.cache.get(
        department.submember_role
      );

      if (!userMember.roles.cache.has(department.submember_role)) {
        await interaction.editReply({
          content:
            "🔴 ERROR: You cannot add PBR to associates from another department.",
        });
        return;
      }

      const connection = await pool
        .getConnection()
        .catch((err) => console.log(err));

      try {
        const selectQuery = "SELECT * FROM Sub_Members WHERE MEMBER_ID = ?";
        const [submember] = await connection.query(selectQuery, [user.id]);
        const timeRendered = parseInt(submember[0].TIME_RENDERED);
        const totalHours = moment.duration(timeRendered, "minutes").asHours();

        const hours = Math.floor(timeRendered / 60);
        const minutes = timeRendered % 60;

        const fixedPay = Number(totalHours) * 30;
        const pbrPay = pbr * Number(totalHours);
        const totalPay = fixedPay + pbrPay;

        const updateQuery =
          "UPDATE Sub_Members SET PBR = ?, TIME_RENDERED = ? WHERE MEMBER_ID = ?";
        await connection.query(updateQuery, [pbr, 0, user.id]);

        const embed = new EmbedBuilder()
          .setTitle(`📝 ASSOCIATE EVALUATION`)
          .setColor(role.color)
          .addFields([
            {
              name: "Member",
              value: userMember.toString(),
            },
            {
              name: `Hours Rendered`,
              value: `${hours} hours and ${minutes} minutes`,
            },
            {
              name: "PBR",
              value: pesoFormatter.format(pbr),
            },
            {
              name: `Fixed Salary`,
              value: pesoFormatter.format(fixedPay),
            },
            {
              name: `Performance Based Salary`,
              value: pesoFormatter.format(pbrPay),
            },
            {
              name: `Total Salary`,
              value: pesoFormatter.format(totalPay),
            },
          ]);

        await client.channels.cache.get("1194283985870782565").send({
          embeds: [embed],
        });

        const successEmbed = new EmbedBuilder()
          .setDescription(
            "## SUCCESS\nYou have sucessfully added PBR to your associate."
          )
          .setColor("Green");

        await interaction.editReply({
          embeds: [successEmbed],
        });
        return;
      } catch (error) {
        console.log(error);
        await interaction.editReply({
          content:
            "🔴 ERROR: There was an error while adding PBR to the selected user.",
        });
        return;
      } finally {
        await connection.release();
      }
    }
  },
};
