module.exports = {
  data: {
    name: `announcementSubmit`,
  },
  async execute(interaction, client) {
    const messageEmbed = interaction.message.embeds[0];
    if (!messageEmbed.data.fields[0].value.includes(interaction.user.id)) {
      await interaction.reply({
        content: `You cannot use this button.`,
        ephemeral: true,
      });
      return;
    }

    await interaction.deferUpdate();

    const executiveRole = await interaction.guild.roles.cache.get(
      "1185935514042388520"
    );

    let mentions;
    if (messageEmbed.data.fields[1]) {
      mentions = messageEmbed.data.fields[1].value.replace("\n", " ");
    } else {
      if (messageEmbed.data.color === executiveRole.color) {
        mentions = `<@&1185935514042388520>`;
      } else {
        mentions = `<@&1196806310524629062>`;
      }
    }

    const message = await interaction.message.channel.messages.fetch(
      interaction.message.id
    );

    let channel;
    if (messageEmbed.data.color === executiveRole.color) {
      channel = "1197101506638381188";
    } else {
      channel = "1197101565421568082";
    }

    const announcementMessage = await client.channels.cache
      .get(channel)
      .send({
        content: mentions,
        embeds: [messageEmbed.data],
      })
      .then((msg) => {
        message.delete();
      });

    let announcementMentions = [];
    if (announcementMessage.mentions.roles.size) {
      const firstRole = announcementMessage.mentions.roles.first();
      firstRole.members.forEach((user) => {
        announcementMentions.push(user.id);
      });
    } else {
      announcementMessage.mentions.users.forEach((user) => {
        announcementMentions.push(user.id);
      });
    }

    const announcementToStore = {
      id: announcementMessage.id,
      mentions: announcementMentions,
      createdAt: announcementMessage.createdAt,
    };

    await storeAnnouncement(announcementToStore);
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
    console.log("Vote stored successfully.");
  } catch (error) {
    console.error("Error storing Vote:", error);
  }
}
