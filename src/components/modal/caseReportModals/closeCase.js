const { EmbedBuilder, MessageFlags } = require("discord.js");

const sqliteDb = require("../../../sqliteConnection.js");
const chalk = require("chalk");

module.exports = {
  data: {
    name: "closeCaseConfirmation",
  },
  async execute(interaction, client) {
    await interaction.deferReply();

    const modalInput = interaction.fields
      .getTextInputValue("closeCaseInput")
      .trim()
      .toUpperCase();

    let messageEmbed = interaction.message.embeds[0];
    const caseThreadChannel = await client.channels.cache.get(
      interaction.message.channelId
    );

    const inputMatch = messageEmbed.title.match(/CASE \d+/);

    if (inputMatch && inputMatch[0].trim().toUpperCase() === modalInput) {
      messageEmbed.data.footer = {
        icon_url: interaction.user.displayAvatarURL(),
        text: `This case has been closed by ${
          interaction.member?.nickname.replace(/^[🔴🟢]\s*/, "") ||
          interaction.user.globalName
        }`,
      };

      messageEmbed.data.color = 15548997;

      await interaction.message.edit({
        embeds: [messageEmbed],
        components: [],
      });

      const replyEmbed = new EmbedBuilder()
        .setDescription(
          `## 🔔 UPDATE\n> **${
            interaction.member?.nickname.replace(/^[🔴🟢]\s*/, "") ||
            interaction.user.globalName
          }** has closed the case.`
        )
        .setColor("Yellow");

      await interaction.editReply({
        embeds: [replyEmbed],
      });

      await caseThreadChannel.edit({
        name: caseThreadChannel.name.replace("🟢", "🔴"),
        archived: true,
        locked: true,
      });

      return;
    } else {
      console.log("Mismatch detected:", {
        extracted: inputMatch?.[0],
        userInput: modalInput,
      });

      const replyEmbed = new EmbedBuilder()
        .setDescription(
          `🔴 ERROR: Cannot close the case. There was a **mismatch** on the case number input.`
        )
        .setColor("Red");

      return await interaction.editReply({
        embeds: [replyEmbed],
      });
    }
  },
};
