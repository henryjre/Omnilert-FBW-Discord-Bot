const {
  SlashCommandBuilder,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require("discord.js");
const { managementPool } = require("../../sqlConnection");
const moment = require("moment");

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

const departments = [
  {
    department: "Operations",
    officeChannelId: "1117386962580541473",
    executive: "1201413097697591327",
    department_role: "1203938264898211920",
  },
  {
    department: "Procurement",
    officeChannelId: "1117386986374823977",
  },
  {
    department: "Design",
    officeChannelId: "1117387017089728512",
  },
  {
    department: "Web Development",
    officeChannelId: "1117387044696641607",
    executive: "748568303219245117",
    department_role: "1117440563361366147",
  },
  {
    department: "Finance",
    officeChannelId: "1118180874136059964",
  },
  {
    department: "Livestream",
    officeChannelId: "1185979300936155136",
  },
  {
    department: "Tiktok Account",
    officeChannelId: "1185979374198071436",
    executive: "752713584148086795",
    department_role: "1187702183802720327",
  },
  {
    department: "Tiktok Seller Center",
    officeChannelId: "1185979531216027730",
  },
  {
    department: "Lazada Seller Center",
    officeChannelId: "1197118556467376188",
  },
  {
    department: "Shopee Seller Center",
    officeChannelId: "1197118789855223888",
  },
];

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
    department.department_role
  );

  if (!userMember.roles.cache.has(department.department_role)) {
    await interaction.editReply({
      content:
        "🔴 ERROR: You cannot add PBR to associates from another department.",
    });
    return;
  }

  const connection = await managementPool
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

  const department = departments.find((d) => d.department_role === role.id);

  if (!department) {
    await interaction.editReply({
      content: "🔴 ERROR: Invalid department selected.",
    });
    return;
  }

  const executive = await interaction.guild.members.cache.get(
    department.executive
  );

  const connection = await managementPool
    .getConnection()
    .catch((err) => console.log(err));

  try {
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
      content:
        "🔴 ERROR: There was an error while adding the associate. Please try again.",
    });
    return;
  } finally {
    await connection.release();
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
