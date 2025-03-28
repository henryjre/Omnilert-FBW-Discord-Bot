const {
  ActionRowBuilder,
  MessageFlags,
  EmbedBuilder,
  ButtonStyle,
  ButtonBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

const { google } = require("googleapis");

const credentials = JSON.parse(
  Buffer.from(process.env.googleServiceAccountKey, "base64").toString("utf8")
);

const hrDepartmentChannel = "1342837776017657940";
const financeDepartmentChannel = "1342837676700602471";
const ehChannel = "1342837500116336823";

const hrLogsChannel = "1343869449455009833";
const financeLogsChannel = "1346465399369367645";

const hrRole = "1314815153421680640";
const financeRole = "1314815202679590984";
const ehRole = "1314414836926386257";

const financeType = [
  "SALARY/WAGE",
  "CASH ADVANCE",
  "EXPENSE REIMBURSEMENT",
  "TRAINING ALLOWANCE",
  "TRANSPORT ALLOWANCE",
  "CASH DEPOSIT",
];

module.exports = {
  data: {
    name: `approveAuthorization`,
  },
  async execute(interaction, client) {
    let messageEmbed = interaction.message.embeds[0];

    let attachments = [];

    if (interaction.message.attachments.size > 0) {
      attachments = Array.from(interaction.message.attachments.values());
    }

    const replyEmbed = new EmbedBuilder();

    const ownerFieldNames = [
      "Assigned Name",
      "Employee Name",
      "Notification By",
      "Reported By",
      "Requested By",
    ];

    const mentionableMembers = messageEmbed.data.fields
      .filter((f) => ownerFieldNames.includes(f.name))
      .map((f) => f.value)
      .join("\n");

    if (
      (!interaction.member.roles.cache.has(hrRole) &&
        !interaction.member.roles.cache.has(financeRole) &&
        !interaction.member.roles.cache.has(ehRole)) ||
      (interaction.member.roles.cache.has(hrRole) &&
        interaction.message.channelId !== hrDepartmentChannel) ||
      (interaction.member.roles.cache.has(financeRole) &&
        interaction.message.channelId !== financeDepartmentChannel)
    ) {
      replyEmbed
        .setDescription(`🔴 ERROR: You cannot use this button.`)
        .setColor("Red");

      return await interaction.reply({
        embeds: [replyEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }

    const embedTitle = messageEmbed.data.description;
    const isFinanceType = financeType.some((type) => embedTitle.includes(type));

    let logsChannel;

    if (isFinanceType) {
      logsChannel = financeLogsChannel;
    } else if (interaction.member.roles.cache.has(financeRole)) {
      logsChannel = financeLogsChannel;
    } else if (
      interaction.member.roles.cache.has(hrRole) ||
      interaction.member.roles.cache.has(ehRole)
    ) {
      logsChannel = hrLogsChannel;
    }

    const modal = new ModalBuilder()
      .setCustomId(`approveRequest_${interaction.id}`)
      .setTitle(`Additional Details`);

    const details = new TextInputBuilder()
      .setCustomId(`additionalNotes`)
      .setLabel(`Notes (OPTIONAL)`)
      .setPlaceholder(
        `Add some additional details/notes for the employees assigned.`
      )
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false);

    const firstRow = new ActionRowBuilder().addComponents(details);
    modal.addComponents(firstRow);
    await interaction.showModal(modal);

    const modalResponse = await interaction.awaitModalSubmit({
      filter: async (i) => {
        const f =
          i.customId === `approveRequest_${interaction.id}` &&
          i.user.id === interaction.user.id;

        if (f) {
          await i.deferUpdate();
        }
        return f;
      },
      time: 120000,
    });

    try {
      if (modalResponse.isModalSubmit()) {
        const details =
          modalResponse.fields.getTextInputValue("additionalNotes");

        if (details) {
          messageEmbed.data.description += `\n\u200b\nAdditional notes from **${interaction.member.nickname.replace(
            /^[🔴🟢]\s*/,
            ""
          )}**:\n>>> *${details}*`;
        }

        messageEmbed.data.footer = {
          text: `Approved By: ${interaction.member.nickname.replace(
            /^[🔴🟢]\s*/,
            ""
          )}`,
        };

        messageEmbed.data.color = 5763719;

        const messagePayload = {
          content: mentionableMembers,
          embeds: [messageEmbed],
        };

        if (attachments.length > 0) {
          messagePayload.files = attachments;
        }

        await client.channels.cache
          .get(logsChannel)
          .send(messagePayload)
          .then((msg) => {
            interaction.message.delete();
          });

        if (!isFinanceType) {
          await insertToGoogleSheet(messageEmbed, client);
        }
      }
    } catch (error) {
      console.log(error);
      // await modalResponse.followUp({
      //   content: `🔴 ERROR: An error occurred while creating your signature request. Please try again.`,
      //   flags: MessageFlags.Ephemeral,
      // });
    }
  },
};

async function insertToGoogleSheet(messageEmbed, client) {
  const { type, date, branch, shift, employeeName } = await filterData(
    messageEmbed,
    client
  );

  console.log(type, date, branch, shift, employeeName);

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  const spreadsheetId = process.env.sheetId; // Replace with actual ID
  const sheetName = "Authorization Requests";

  const values = [[type, date, branch, shift, employeeName]];

  try {
    // Append data to the sheet
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:E`, // Target range
      valueInputOption: "USER_ENTERED", // Lets Google format date values
      insertDataOption: "INSERT_ROWS",
      resource: { values },
    });

    console.log("Data successfully inserted:", response.data.updates);
  } catch (error) {
    console.error("Error inserting data:", error);
  }
}

async function filterData(embed, client) {
  const fields = embed.data.fields;

  let data = {
    type: "",
    date: "",
    branch: "",
    shift: "",
    employeeName: "",
  };

  // Helper function to get field value safely
  const getFieldValue = (name) => {
    const value = fields.find((f) => f.name === name)?.value || "";
    return value.includes("|") ? value.split("|")[1].trim() : value.trim();
  };

  // Extract user ID from Discord mention format
  const extractUserId = (mention) => {
    const match = mention.match(/^<@!?(\d+)>$/);
    return match ? match[1] : null;
  };

  // Optimized function to get nickname
  const getUserNickname = async (mention) => {
    const userId = extractUserId(mention);
    if (!userId) return mention; // Return original if not a mention

    const guild = client.guilds.cache.get(
      process.env.node_env === "prod"
        ? process.env.prodGuildId
        : process.env.testGuildId
    );
    if (!guild) return mention; // Guild not found

    let member = guild.members.cache.get(userId);
    if (!member) {
      try {
        member = await guild.members.fetch(userId);
      } catch (error) {
        console.error(`Failed to fetch member ${userId}:`, error);
        return mention;
      }
    }

    // Clean nickname format: Remove emojis/symbols at the start
    return (member.nickname || member.user.username)
      .replace(/^[^\p{L}\p{N}]+/u, "")
      .trim();
  };

  // Determine the request type
  switch (true) {
    case embed.data.description.includes("TARDINESS AUTHORIZATION REQUEST"):
      data.type = "Tardiness Authorization Request";
      break;
    case embed.data.description.includes("ABSENCE AUTHORIZATION REQUEST"):
      data.type = "Absence Authorization Request";
      break;
    case embed.data.description.includes("UNDERTIME AUTHORIZATION REQUEST"):
      data.type = "Undertime Authorization Request";
      break;
    case embed.data.description.includes("INTERIM DUTY FORM"):
      data.type = "Interim Duty Form";
      data.shift = getFieldValue("Shift Coverage");
      break;
    case embed.data.description.includes("OVERTIME CLAIM"):
      data.type = "Overtime Claim";
      data.shift = getFieldValue("Shift Coverage");
      break;
    case embed.data.description.includes("SHIFT EXCHANGE REQUEST"):
      data.type = "Shift Exchange Request";
      data.shift = getFieldValue("Shift Coverage");

      // Fetch both assigned and reliever names in parallel
      const [assigned, reliever] = await Promise.all([
        getUserNickname(getFieldValue("Assigned Name")),
        getUserNickname(getFieldValue("Reliever Name")),
      ]);

      data.employeeName = `${assigned} and ${reliever}`;
      break;
    default:
      return null;
  }

  // Common field assignments with safe fallback
  data.date = getFieldValue("Date");
  data.branch = getFieldValue("Branch");

  // Assign employee name for cases that don’t have custom logic
  if (!data.employeeName) {
    data.employeeName = await getUserNickname(getFieldValue("Employee Name"));
  }

  if (!data.shift) {
    data.shift = getFieldValue("Shift");
  }

  return data;
}
