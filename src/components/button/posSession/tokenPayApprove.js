const { MessageFlags, EmbedBuilder } = require("discord.js");

const departments = require("../../../config/departments.json");

module.exports = {
  data: {
    name: `posOrderVerificationApprove`,
  },
  async execute(interaction, client) {
    let messageEmbed = interaction.message.embeds[0];

    const replyEmbed = new EmbedBuilder();

    const sessionField = messageEmbed.data.fields.find(
      (f) => f.name === "Session Name"
    );

    const messageMention = interaction.message.mentions.users.first();

    if (interaction.user.id !== messageMention?.id) {
      replyEmbed
        .setDescription(`🔴 ERROR: You cannot use this button.`)
        .setColor("Red");

      return await interaction.reply({
        embeds: [replyEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }

    const sessionName = sessionField.value;

    const department = departments.find(
      (d) => d.verificationChannel === interaction.message.channelId
    );

    const posChannel = client.channels.cache.get(department.posChannel);

    const sessionMessage = await posChannel.messages
      .fetch({ limit: 100 })
      .then((messages) =>
        messages.find((msg) => msg.content.includes(sessionName))
      );

    const posThread = await sessionMessage.thread;

    if (!posThread) {
      return await modalResponse.followUp({
        content: `🔴 ERROR: No thread found.`,
        ephemeral: true,
      });
    }

    messageEmbed.data.footer = {
      text: `Approved By: ${interaction.member.nickname.replace(
        /^[🔴🟢]\s*/,
        ""
      )}`,
    };

    await posThread.send({
      embeds: [messageEmbed],
    });

    await interaction.message.delete();
  },
};
