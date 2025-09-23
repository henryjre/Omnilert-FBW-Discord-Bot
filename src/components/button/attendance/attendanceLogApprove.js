const { EmbedBuilder, MessageFlags } = require("discord.js");

const { google } = require("googleapis");
const moment = require("moment-timezone");

const { editAttendance } = require("../../../odooRpc.js");

const credentials = JSON.parse(
  Buffer.from(process.env.googleServiceAccountKey, "base64").toString("utf8")
);

const hrRoleId = "1314815153421680640";
const hrLogsChannel = "1343869449455009833";

module.exports = {
  data: {
    name: `attendanceLogApprove`,
  },
  async execute(interaction, client) {
    // if (!interaction.member.roles.cache.has(hrRoleId)) {
    //   await interaction.reply({
    //     content: `🔴 ERROR: You cannot use this button.`,
    //     flags: MessageFlags.Ephemeral,
    //   });
    //   return;
    // }

    await interaction.deferUpdate();

    const messageEmbed = interaction.message.embeds[0];

    try {
      const approvedBy = interaction.member.nickname.replace(/^[🔴🟢]\s*/, "");

      const discordUserField = messageEmbed.data.fields.find(
        (f) => f.name === "Discord User"
      );
      const discordUser = cleanFieldValue(discordUserField.value);

      messageEmbed.data.fields.push({
        name: "Status",
        value: "🟢 | Approved",
      });

      messageEmbed.data.footer = {
        text: `Approved By: ${approvedBy}`,
      };

      messageEmbed.data.color = 5763719;

      const messagePayload = {
        embeds: [messageEmbed],
        components: [],
      };

      const replyEmbed = new EmbedBuilder().setColor("Green");

      if (messageEmbed.data.description.includes("EARLY ATTENDANCE APPROVAL")) {
        replyEmbed.setDescription(
          `### Your early check in has been approved. No changes have been made to your attendance.`
        );
      } else if (
        messageEmbed.data.description.includes("LATE CHECKOUT APPROVAL")
      ) {
        replyEmbed.setDescription(
          `### Your late checkout has been approved. No changes have been made to your attendance.`
        );
      } else if (
        messageEmbed.data.description.includes(
          "TARDINESS AUTHORIZATION REQUEST"
        )
      ) {
        const response = await approveTardiness(interaction, client);
        if (!response.ok) {
          throw new Error(response.message);
        }
        replyEmbed.setDescription(
          `### Your tardiness request has been approved. Your check in time has been updated.`
        );
        replyEmbed.addFields({
          name: "New Check-In Time",
          value: `⏱️ | ${response.timestamp}`,
        });
      }

      await interaction.message.edit(messagePayload);

      await interaction.channel.send({
        content: discordUser,
        embeds: [replyEmbed],
      });

      // await insertToGoogleSheet(messageEmbed, client);
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
  const filteredData = await filterData(messageEmbed, client);

  if (!filteredData) {
    console.log("No data to insert");
    return;
  }

  const { type, date, branch, shift, employeeName } = filteredData;

  console.log(type, date, branch, shift, employeeName);

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  const spreadsheetId = process.env.sheetId;
  const sheetName = "Authorization Requests V2";

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

////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////// APPROVE TARDINESS ///////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////

async function approveTardiness(interaction, client) {
  const messageEmbed = interaction.message.embeds[0];

  const attendanceIdField = messageEmbed.data.fields.find(
    (field) => field.name === "Attendance ID"
  );
  const startDateField = messageEmbed.data.fields.find(
    (field) => field.name === "Shift Start Date"
  );

  const attendanceId = cleanFieldValue(attendanceIdField.value);
  const startDate = cleanFieldValue(startDateField.value);
  const parsedStartDate = formatDateToISOString(startDate);

  const payload = {
    attendanceId: attendanceId,
    field: "check_in",
    timestamp: parsedStartDate,
  };

  try {
    const response = await editAttendance(payload);
    console.log(response);
    return {
      ok: true,
      message: "Attendance updated successfully",
      timestamp: startDate,
    };
  } catch (error) {
    console.error(error);
    return { ok: false, message: "Error updating attendance" };
  }
}

////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////// HELPER FUNCTIONS ///////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////

function cleanFieldValue(s) {
  return s.replace(/^[^|]*\|\s*/, "").trim();
}

function formatDateToISOString(dateString, timezone = "Asia/Manila") {
  // Parse the date string using moment
  const parsedDate = moment.tz(
    dateString,
    "MMMM D, YYYY [at] h:mm A",
    timezone
  );

  // Check if the date is valid
  if (!parsedDate.isValid()) {
    throw new Error(`Invalid date format: ${dateString}`);
  }

  // Format as ISO 8601 string with timezone offset
  return parsedDate.format("YYYY-MM-DDTHH:mm:ssZ");
}
