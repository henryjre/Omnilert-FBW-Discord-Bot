const { EmbedBuilder } = require("@discordjs/builders");
const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");

const client = require("../../../../index");
const pools = require("../../../../sqlPools.js");
const moment = require("moment-timezone");

const fs = require("fs").promises;
const path = require("path");

module.exports = async (req, res) => {
  try {
    const announcements = await getStoredAnnouncements();
    if (announcements.length === 0) {
      console.log("No announcements found. Ending job...");
      return res.status(200).json({ ok: true, message: "success" });
    }

    const dueAnnouncements = announcements.filter((a) => {
      const parsedTime = moment(a.createdAt).tz("Asia/Manila");
      const twentyFourHoursAgo = moment.tz("Asia/Manila").subtract(24, "hours");
      return twentyFourHoursAgo.isSameOrAfter(parsedTime);
    });

    if (dueAnnouncements.length === 0) {
      console.log("No due announcements found. Ending job...");
      return res.status(200).json({ ok: true, message: "success" });
    }

    const mgmt_connection = await pools.managementPool.getConnection();
    try {
      const selectQuery = `SELECT * FROM Executives WHERE NCR_OFFICE_ID IS NOT NULL;`;
      const [executives] = await mgmt_connection.query(selectQuery);

      const idToRemove = [];
      for (const announcement of dueAnnouncements) {
        idToRemove.push(announcement.id);

        if (announcement.mentions.length === 0) {
          continue;
        }

        for (const mentionedId of announcement.mentions) {
          const exec = executives.find((e) => e.MEMBER_ID === mentionedId);
          if (!exec) continue;

          await createNcr(exec, announcement.id);
        }
      }

      const updatedAnnouncementsData = announcements.filter(
        (a) => !idToRemove.includes(a.id)
      );

      updateStoredAnnouncements(updatedAnnouncementsData);

      return res.status(200).json({ ok: true, message: "success" });
    } finally {
      mgmt_connection.release();
    }
  } catch (error) {
    console.log(error.stack);
    return res.status(404).json({ ok: false, message: error.message });
  }
};

const filePath = path.join(
  __dirname,
  "../../../../temp/announcementReactions.json"
);

async function getStoredAnnouncements() {
  try {
    const data = await fs.readFile(filePath, "utf-8");
    const jsonObject = JSON.parse(data);
    console.log("Announcements retrieved successfully");
    return jsonObject;
  } catch (error) {
    console.log("Error retrieving announcement:", error);
    return [];
  }
}

async function updateStoredAnnouncements(updatedData) {
  try {
    await fs.writeFile(filePath, JSON.stringify(updatedData));
    console.log("Announcements updated successfully.");
  } catch (error) {
    console.error("Error updating announcements:", error);
  }
}

async function createNcr(executive, announcementId) {
  const ncrChannel = client.channels.cache.get(executive.NCR_OFFICE_ID);
  const departmentRole = client.guilds.cache
    .get("1049165537193754664")
    .roles.cache.get(executive.ROLE_ID);

  const ncrEmbed = new EmbedBuilder()
    .setDescription(
      `# 🚨 NON-CONFORMANCE REPORT\n## *No Announcement Reaction Received*`
    )
    .addFields([
      {
        name: "Deficiency Details",
        value: `The reported executive did not react to the announcement that they were mentioned in.\n\n***Announcement Link:** [Click here to view the announcement message](https://discord.com/channels/1049165537193754664/1197101506638381188/${announcementId})*`,
      },
      //   {
      //     name: "Impact",
      //     value: ``,
      //   },
      //   {
      //     name: "Corrective Action",
      //     value: correctiveAction,
      //   },
      //   {
      //     name: "Preventive Action",
      //     value: preventiveAction,
      //   },
    ])
    .setFooter({
      text: `This Non-Conformance Report will be rated by the Executive Department Head depending on the severity.`,
    })
    .setColor(departmentRole.color);

  const rateButton = new ButtonBuilder()
    .setCustomId("ncrRate")
    .setLabel("Rate")
    .setStyle(ButtonStyle.Success);

  const buttonRow = new ActionRowBuilder().addComponents(rateButton);

  await ncrChannel.send({
    content: `<@${executive.MEMBER_ID}>`,
    embeds: [ncrEmbed],
    components: [buttonRow],
  });
}
