const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");

module.exports = {
  data: {
    name: "purchaseRequisitionOpen",
  },
  async execute(interaction, client) {
    const link = interaction.fields.getTextInputValue("linkInput");
    const addon = interaction.fields.getTextInputValue("addonInput");

    const author = interaction.guild.members.cache.get(interaction.user.id);
    const prChannel = client.channels.cache.get("1210535325890510918");

    await interaction.deferReply({ ephemeral: true });

    if (!isURL(link)) {
      return await interaction.editReply({
        content: "🔴 ERROR: Enter a valid URL.",
      });
    }

    const botMessages = await prChannel.messages.fetch().then((messages) => {
      return messages.filter((m) => m.author.bot && m.embeds.length > 0);
    });

    const lastMessages = botMessages.first();

    let requestNumber;
    if (lastMessages) {
      const lastEmbed = lastMessages.embeds[0];
      const match = lastEmbed.data.title.match(/\d+/);
      requestNumber = match
        ? (Number(match[0]) + 1).toString().padStart(4, "0")
        : "00000";
    } else {
      requestNumber = "0008";
    }

    const embed = new EmbedBuilder()
      .setDescription(
        `## PR is open!\nPlease check the <#1210535325890510918> channel to check your purchase requisition.`
      )
      .setColor("Green");

    const prEmbed = new EmbedBuilder()
      .setTitle(`🧾 Purchase Requisition #${requestNumber}`)
      .setAuthor({ name: "Open" })
      .addFields([
        {
          name: "Opened By",
          value: author.toString(),
        },
      ])
      .setTimestamp(Date.now())
      .setColor("Green");

    if (addon.length > 0) {
      prEmbed.setDescription(`> ${addon}`);
    }

    const closePr = new ButtonBuilder()
      .setCustomId("closePR")
      .setLabel("Close")
      .setStyle(ButtonStyle.Danger);

    const prLink = new ButtonBuilder()
      .setURL(link)
      .setLabel("PR Files")
      .setStyle(ButtonStyle.Link);

    const buttonRow = new ActionRowBuilder().addComponents(closePr, prLink);

    await interaction.editReply({
      embeds: [embed],
      ephemeral: true,
    });

    await prChannel.send({
      embeds: [prEmbed],
      components: [buttonRow],
    });
  },
};

function isURL(str) {
  // Regular expression for a basic URL pattern
  const urlPattern = /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/;
  return urlPattern.test(str);
}
