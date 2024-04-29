const {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} = require("discord.js");
const client = require("../../../../index");

module.exports = async (req, res) => {
  const { doc_url, executive_name } = req.body;

  try {
    if (!doc_url) {
      throw new Error("No URL");
    }

    const embed = new EmbedBuilder()
      .setTitle(executive_name)
      .setDescription(`PBR Voting is now open for this executive.`)
      .setColor("Blurple");

    const link = new ButtonBuilder()
      .setLabel("Submit Vote")
      .setURL(doc_url)
      .setStyle(ButtonStyle.Link);

    const buttonRow = new ActionRowBuilder().addComponents(link);

    client.channels.cache.get("1186662402247368704").send({
      embeds: [embed],
      components: [buttonRow],
    });

    return res.status(200).json({ ok: true, message: "success" });
  } catch (error) {
    console.log(error.stack);
    return res.status(404).json({ ok: false, message: error.message });
  }
};
