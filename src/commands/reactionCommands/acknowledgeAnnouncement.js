const fs = require("fs").promises;
const path = require("path");

const filePath = path.join(__dirname, "../../temp/announcementReactions.json");

module.exports = {
  name: "acknowledgeAnnouncement",
  async execute(reaction, user, client) {
    const message = await reaction.message.channel.messages.fetch(
      reaction.message.id
    );
    const messageEmbed = message.embeds[0];
    const userField = messageEmbed.data.fields[1];

    const mentionedUsers = message.mentions.users.map((u) => u.id);
    const mentionedRole = message.mentions.roles.map((r) => r.id);

    if (mentionedUsers.length > 0 && mentionedUsers.includes(user.id)) {
      if (
        userField.value.includes(`<@${user.id}>`) &&
        !userField.value.includes(`✔ <@${user.id}>`)
      ) {
        messageEmbed.data.fields[1].value = userField.value.replace(
          `<@${user.id}>`,
          `✔ <@${user.id}>`
        );
      }
    } else if (mentionedRole.length > 0) {
      if (userField) {
        if (
          userField.value.includes(`<@${user.id}>`) &&
          !userField.value.includes(`✔ <@${user.id}>`)
        ) {
          messageEmbed.data.fields[1].value = userField.value.replace(
            `<@${user.id}>`,
            `✔ <@${user.id}>`
          );
        } else if (!userField.value.includes(`<@${user.id}>`)) {
          messageEmbed.data.fields[1].value += `\n✔ <@${user.id}>`;
        }
      } else {
        messageEmbed.data.fields.push({
          name: "Acknowledgement",
          value: `✔ <@${user.id}>\n`,
        });
      }
    } else {
      return;
    }

    await message.edit({
      embeds: [messageEmbed],
    });

    const announcements = await getStoredAnnouncements();
    if (announcements.length !== 0) {
      const announcement = announcements.find((a) => a.id === message.id);
      if (announcement) {
        announcement.mentions = announcement.mentions.filter(
          (mention) => mention !== user.id
        );

        await updateStoredAnnouncements(announcements);
      }
    }
  },
};

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
