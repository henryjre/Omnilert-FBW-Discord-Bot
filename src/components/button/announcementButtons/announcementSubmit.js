const fs = require("fs").promises;
const { EmbedBuilder } = require("discord.js");
const path = require("path");

const targetChannel = "1314416941481328650";

module.exports = {
  data: {
    name: `announcementSubmit`,
  },
  async execute(interaction, client) {
    let messageEmbed = interaction.message.embeds[0];
    const ownerField = messageEmbed.data.fields.find(
      (f) => f.name === "Prepared By"
    );

    const targetField = messageEmbed.data.fields.find(
      (f) => f.name === "Recipients"
    );

    if (!ownerField.value.includes(interaction.user.id)) {
      const replyEmbed = new EmbedBuilder()
        .setDescription(`🔴 ERROR: You cannot use this menu.`)
        .setColor("Red");

      return await interaction.editReply({
        embeds: [replyEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferUpdate();

    const newFields = messageEmbed.data.fields.filter(
      (item) => item.name !== "Recipient"
    );

    messageEmbed.data.fields = newFields;

    const announcementMessage = await client.channels.cache
      .get(targetChannel)
      .send({
        content: targetField.value,
        embeds: [messageEmbed],
      });

    await interaction.message.delete();

    // if (channel === "1197101506638381188") {
    //   let announcementMentions = [];
    //   if (announcementMessage.mentions.roles.size) {
    //     const firstRole = announcementMessage.mentions.roles.first();
    //     firstRole.members.forEach((user) => {
    //       announcementMentions.push(user.id);
    //     });
    //   } else {
    //     announcementMessage.mentions.users.forEach((user) => {
    //       announcementMentions.push(user.id);
    //     });
    //   }

    //   const announcementToStore = {
    //     id: announcementMessage.id,
    //     mentions: announcementMentions,
    //     createdAt: announcementMessage.createdAt,
    //   };

    //   await storeAnnouncement(announcementToStore);
    // }
  },
};

async function storeAnnouncement(jsonObject) {
  const filePath = path.join(
    __dirname,
    "../../../temp/announcementReactions.json"
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
    console.error("Error storing Vote:", error);
  }
}
