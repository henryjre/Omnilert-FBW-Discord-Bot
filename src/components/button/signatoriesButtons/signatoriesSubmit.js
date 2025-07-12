const {
  ActionRowBuilder,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

module.exports = {
  data: {
    name: `signatoriesSubmit`,
  },
  async execute(interaction, client) {
    const replyEmbed = new EmbedBuilder();

    let allEmbeds = interaction.message.embeds;
    const messageEmbed = allEmbeds[0];
    const files = interaction.message.attachments.map((a) => a.url);

    if (
      !messageEmbed.data.fields
        .find((f) => f.name === "Prepared By")
        .value.includes(interaction.user.id)
    ) {
      replyEmbed
        .setDescription(`🔴 ERROR: You cannot use this menu.`)
        .setColor("Red");

      return await interaction.editReply({ embeds: [replyEmbed] });
    }

    const sign = new ButtonBuilder()
      .setCustomId("signatoriesSign")
      .setLabel("Sign")
      .setStyle(ButtonStyle.Success);

    const reject = new ButtonBuilder()
      .setCustomId("signatoriesReject")
      .setLabel("Reject")
      .setStyle(ButtonStyle.Danger);

    const buttonRow = new ActionRowBuilder().addComponents(sign, reject);

    messageEmbed.data.footer.text = `Sign the request to approve the document or reject to return it to the author.`;

    const embedFields = messageEmbed.data.fields;

    const firstField = embedFields[1];

    if (firstField.value.includes("To be signed ⌛")) {
      const department = firstField.value.split(" - ");
      const channelId = department[0];
      const role = department[1];
      const channel = interaction.guild.channels.cache.get(channelId);

      await channel.send({
        content: `${role}`,
        embeds: allEmbeds,
        components: [buttonRow],
        files: files,
      });
    } else {
      const employee = firstField.value.replace("⌛", "").trim();
      const channel = interaction.guild.channels.cache.get(
        "1337029532921888840"
      );

      await channel.send({
        content: `${employee}`,
        embeds: allEmbeds,
        components: [buttonRow],
        files: files,
      });
    }

    await interaction.message.delete();

    if (interaction.message.hasThread) {
      const thread = interaction.message.thread;
      await thread.delete();
    }
  },
};
