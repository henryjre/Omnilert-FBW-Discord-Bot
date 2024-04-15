const {
  SlashCommandBuilder,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require("discord.js");
const conn = require("../../sqlConnection");
const moment = require("moment");

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

module.exports = {
  data: new SlashCommandBuilder()
    .setName("add")
    .setDescription("Add something...")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("pbr")
        .setDescription("Add PBR to an Associate")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("The target Associate.")
            .setRequired(true)
        )
        .addNumberOption((option) =>
          option
            .setName("pbr-value")
            .setDescription("The amount of PBR ranging from 1 - 30 PHP.")
            .setRequired(true)
            .setMaxValue(30)
            .setMinValue(0)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("associate")
        .setDescription("Add an associate to your department")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("The target user to add.")
            .setRequired(true)
        )
        .addRoleOption((option) =>
          option
            .setName("department")
            .setDescription("The target role of the department.")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("liabilities")
        .setDescription("Add liabilities to a livestreamer")
        .addUserOption((option) =>
          option
            .setName("livestreamer")
            .setDescription("The livestreamer to add liabilities to.")
            .setRequired(true)
        )
        .addNumberOption((option) =>
          option
            .setName("amount")
            .setDescription("The amount liabilities to add in peso.")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("streamer")
        .setDescription("Add a new Leviosa Tiktok livestreamer.")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("The user to add.")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("minutes-of-meeting")
        .setDescription("Add minutes of meeting to a concluded meeting.")
        .addStringOption((option) =>
          option
            .setName("meeting-id")
            .setDescription("The meeting ID of a concluded meeting.")
            .setRequired(true)
        )
        .addAttachmentOption((option) =>
          option
            .setName("minutes")
            .setDescription(
              "The document containing the minutes of the meeting."
            )
            .setRequired(true)
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
        await addSubmemberPbr(interaction, client);
        break;

      case "associate":
        await addAssociate(interaction, client);
        break;

      case "liabilities":
        await client.commands.get("add-liab").execute(interaction, client);
        break;

      case "streamer":
        await client.commands.get("add-streamer").execute(interaction, client);
        break;

      case "minutes-of-meeting":
        createMinutesModal(interaction);
        break;

      default:
        break;
    }
  },
};

async function addSubmemberPbr(interaction, client) {
  await interaction.deferReply({ ephemeral: true });
  const user = interaction.options.getUser("user");
  const pbr = interaction.options.getNumber("pbr-value");

  const connection = await conn.managementConnection();

  try {
    const selectDepartmentQuery = `SELECT * FROM Executives WHERE MEMBER_ID = ?`;
    const [department] = await connection.query(selectDepartmentQuery, [
      interaction.user.id,
    ]);

    if (department.length <= 0) {
      await interaction.editReply({
        content:
          "🔴 ERROR: Cannot add PBR to associates. You are not an executive.",
      });
      return;
    }

    const userMember = await interaction.guild.members.cache.get(user.id);
    if (!userMember.roles.cache.has(department[0].ROLE_ID)) {
      await interaction.editReply({
        content:
          "🔴 ERROR: You cannot add PBR to associates from another department.",
      });
      return;
    }

    const role = await interaction.guild.roles.cache.get(department[0].ROLE_ID);

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
    await connection.destroy();
  }
}

async function addAssociate(interaction, client) {
  await interaction.deferReply({ ephemeral: true });
  const user = interaction.options.getUser("user");
  const role = interaction.options.getRole("department");
  const userMember = await interaction.guild.members.cache.get(user.id);

  if (
    userMember.roles.cache.some((r) =>
      ["1196806310524629062", "1185935514042388520"].includes(r.id)
    )
  ) {
    await interaction.editReply({
      content:
        "🔴 ERROR: You cannot add an executive/director as an associate.",
    });
    return;
  }

  const connection = await conn.managementConnection();

  try {
    const selectQuery = `SELECT * FROM Executives WHERE ROLE_ID = ?`;
    const [department] = await connection.query(selectQuery, [role.id]);

    if (department.length <= 0) {
      await interaction.editReply({
        content: "🔴 ERROR: Invalid department selected.",
      });
      return;
    }

    const executive = await interaction.guild.members.cache.get(
      department[0].MEMBER_ID
    );

    const insertQuery =
      "INSERT INTO Sub_Members (MEMBER_ID, USERNAME, DEPARTMENT_EXECUTIVE, OFFICE_ID) VALUES (?, ?, ?, ?)";
    await connection.query(insertQuery, [
      user.id,
      user.username,
      executive.nickname,
      department.officeChannelId,
    ]);

    await userMember.roles.add(["1197888181702496319", role.id]);

    await interaction.editReply({
      content: `✅ Successfully added ${userMember.toString()} as ${role.toString()} associate`,
    });
  } catch (error) {
    console.log(error);
    await interaction.editReply({
      content: error.toString(),
    });
  } finally {
    await connection.destroy();
  }
}

function createMinutesModal(interaction) {
  const meetingId = interaction.options.getString("meeting-id");
  const minutesDoc = interaction.options.getAttachment("minutes");

  if (minutesDoc.contentType !== "application/pdf") {
    interaction.reply({
      content: `🔴 ERROR: The minutes attachment should be a PDF file.`,
      ephemeral: true,
    });
    return;
  }

  const modal = new ModalBuilder();
  modal
    .setCustomId("addMinutes")
    .setTitle(`Add minutes to a concluded meeting.`);

  const title = new TextInputBuilder()
    .setCustomId(`title`)
    .setLabel(`Meeting Summary`)
    .setPlaceholder("What the concluded meeting is all about.")
    .setMaxLength(100)
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const meetingIdInput = new TextInputBuilder()
    .setCustomId(`meetingId`)
    .setLabel(`Meeting ID (DO NOT CHANGE)`)
    .setValue(meetingId)
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const docUrl = new TextInputBuilder()
    .setCustomId(`document`)
    .setLabel(`Document URL (DO NOT CHANGE)`)
    .setValue(minutesDoc.url)
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);

  const firstRow = new ActionRowBuilder().addComponents(title);
  const secondRow = new ActionRowBuilder().addComponents(meetingIdInput);
  const thirdRow = new ActionRowBuilder().addComponents(docUrl);
  modal.addComponents(firstRow, secondRow, thirdRow);

  interaction.showModal(modal);
}
