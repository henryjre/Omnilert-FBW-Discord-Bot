const { EmbedBuilder } = require("discord.js");
const moment = require("moment-timezone");

const fs = require("fs").promises;
const path = require("path");

module.exports = {
  name: "announcementReact",
  async execute(reaction, user, client) {
    const message = await reaction.message.channel.messages.fetch(
      reaction.message.id
    );
    const userId = user.id;

    if (reaction.emoji.name === "✅") {
      let mentions = [];
      if (message.mentions.roles.size) {
        const firstRole = message.mentions.roles.first();
        firstRole.members.forEach((user) => {
          mentions.push(user.id);
        });
      } else {
        message.mentions.users.forEach((user) => {
          mentions.push(user.id);
        });
      }

      const announcementToStore = {
        id: message.id,
        mentions: mentions,
        createdAt: message.createdAt,
      };

      await storeAnnouncement(announcementToStore);
    } else {
      const announcements = await getStoredAnnouncements();
      if (announcements.length !== 0) {
        const announcement = announcements.find((a) => a.id === message.id);
        if (announcement) {
          announcement.mentions = announcement.mentions.filter(
            (mention) => mention !== userId
          );

          await updateStoredAnnouncements(announcements);
        }
      } else {
        console.log("no announcements stored");
      }
    }
  },
};

function timeCheck(timestamp) {
  const parsedTime = moment(timestamp).tz("Asia/Manila");
  const twentyFourHoursAgo = moment.tz("Asia/Manila").subtract(24, "hours");
  return twentyFourHoursAgo.isSameOrAfter(parsedTime);
}

async function storeAnnouncement(jsonObject) {
  const filePath = path.join(
    __dirname,
    "../../temp/announcementReactions.json"
  );
  try {
    // Read existing data
    const existingData = await fs.readFile(filePath, "utf-8");

    // Parse existing data (or initialize as an empty array if the file is empty)
    const existingArray = existingData ? JSON.parse(existingData) : [];

    // Append the new JSON object
    existingArray.push(jsonObject);

    // Write back to the file
    await fs.writeFile(filePath, JSON.stringify(existingArray));
    console.log("Announcement stored successfully.");
  } catch (error) {
    console.error("Error storing announcement:", error);
  }
}

async function getStoredAnnouncements() {
  const filePath = path.join(
    __dirname,
    "../../temp/announcementReactions.json"
  );
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
  const filePath = path.join(
    __dirname,
    "../../temp/announcementReactions.json"
  );
  try {
    await fs.writeFile(filePath, JSON.stringify(updatedData));
    console.log("Announcements updated successfully.");
  } catch (error) {
    console.error("Error updating announcements:", error);
  }
}
