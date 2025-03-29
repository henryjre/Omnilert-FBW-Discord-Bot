const fs = require("fs").promises;
const { EmbedBuilder } = require("discord.js");
const path = require("path");

const generalChannel = "1314416941481328650";
const managementChannel = "1314416207553761403";

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

      return await interaction.reply({
        embeds: [replyEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }

    let channel = generalChannel;

    if (targetField.value.includes("1314413671245676685")) {
      channel = managementChannel;
    }

    await interaction.deferUpdate();

    const newFields = messageEmbed.data.fields.filter(
      (item) => item.name !== "Recipients"
    );

    messageEmbed.data.fields = newFields;

    const announcementMessage = await client.channels.cache.get(channel).send({
      content: targetField.value,
      embeds: interaction.message.embeds,
      files: interaction.message.attachments,
    });

    const existingThread = await interaction.channel.threads.cache.find((t) =>
      t.name.includes(
        `Announcement Attachment Upload - ${interaction.message.id}`
      )
    );

    await existingThread.delete();

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
