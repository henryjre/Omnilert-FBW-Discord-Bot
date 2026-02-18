const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, MessageFlags } = require("discord.js");
const { createAnnouncementTracking } = require("../../../sqliteFunctions");
const { announcementAckQueue } = require("../../../queue/announcementAckQueue");

const generalChannel = "1314416941481328650";
const managementChannel = "1314416207553761403";

// Default timeout in minutes (can be overridden via env)
const ACK_TIMEOUT_MINUTES = parseInt(process.env.ANNOUNCEMENT_ACK_TIMEOUT_MINUTES || '5');

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

    // Create acknowledge button
    const acknowledgeButton = new ButtonBuilder()
      .setCustomId('announcementAcknowledge')
      .setLabel('Acknowledge')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('✅');

    const buttonRow = new ActionRowBuilder().addComponents(acknowledgeButton);

    // Send announcement with acknowledge button
    const announcementMessage = await client.channels.cache.get(channel).send({
      content: targetField.value,
      embeds: interaction.message.embeds,
      files: interaction.message.attachments?.map(
        (attachment) => attachment.url
      ),
      components: [buttonRow],
    });

    // Create Acknowledgements thread
    const ackThread = await announcementMessage.startThread({
      name: 'Acknowledgements',
      autoArchiveDuration: 1440, // 24 hours
    });

    // Extract expected users from mentioned roles or @everyone
    let expectedUsers = [];
    const guild = interaction.guild;

    if (targetField.value.includes('@everyone')) {
      // Track all non-bot members
      await guild.members.fetch();
      expectedUsers = guild.members.cache
        .filter(member => !member.user.bot)
        .map(member => member.id);
    } else if (announcementMessage.mentions.roles.size) {
      // Track members of mentioned roles
      announcementMessage.mentions.roles.forEach(role => {
        role.members.forEach(member => {
          if (!member.user.bot && !expectedUsers.includes(member.id)) {
            expectedUsers.push(member.id);
          }
        });
      });
    } else if (announcementMessage.mentions.users.size) {
      // Track mentioned users
      announcementMessage.mentions.users.forEach(user => {
        if (!user.bot) {
          expectedUsers.push(user.id);
        }
      });
    }

    // Store tracking data in SQLite
    if (expectedUsers.length > 0) {
      createAnnouncementTracking(
        announcementMessage.id,
        channel,
        ackThread.id,
        expectedUsers,
        ACK_TIMEOUT_MINUTES
      );

      // Schedule acknowledgment check job
      const delayMs = ACK_TIMEOUT_MINUTES * 60 * 1000;
      await announcementAckQueue.add(
        'check-acknowledgments',
        {
          announcementId: announcementMessage.id,
          channelId: channel,
          threadId: ackThread.id,
        },
        {
          delay: delayMs,
          jobId: `announcement-ack-${announcementMessage.id}`,
        }
      );

      console.log(`✓ Announcement ${announcementMessage.id} tracking ${expectedUsers.length} users, check scheduled in ${ACK_TIMEOUT_MINUTES} minutes`);
    }

    // Clean up attachment thread if it exists
    const existingThread = await interaction.channel.threads.cache.find((t) =>
      t.name.includes(
        `Announcement Attachment Upload - ${interaction.message.id}`
      )
    );

    if (existingThread) {
      await existingThread.delete();
    }

    await interaction.message.delete();
  },
};
