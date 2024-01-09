const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");

module.exports = {
  data: {
    name: "coreDesignRequest",
  },
  async execute(interaction, client) {
    const member = interaction.guild.members.cache.get(interaction.user.id);

    await interaction.deferReply();

    const botMessages = await interaction.channel.messages
      .fetch({ limit: 3 })
      .then((messages) => {
        return messages.filter((m) => m.author.bot && m.embeds.length > 0);
      });

    const lastMessages = botMessages.first();
    const lastEmbed = lastMessages.embeds[0];

    let requestNumber;
    if (lastEmbed) {
      const match = lastEmbed.data.title.match(/\d+/);
      requestNumber = match ? parseInt(match[0]) + 1 : 0;
    } else {
      requestNumber = 1;
    }

    const keyMappings = {
      requestInput: "Request Details",
      reference1: "Reference #1",
      reference2: "Reference #2",
      reference3: "Reference #3",
    };

    const inputFields = Array.from(
      interaction.fields.fields,
      ([key, value]) => {
        const newKey = keyMappings[key] || key;
        if (value.value !== "") {
          return { name: newKey, value: value.value };
        }
        return null;
      }
    ).filter(Boolean);

    inputFields.unshift({ name: "Requested By", value: member.toString() });

    const requestEmbed = new EmbedBuilder()
      .setTitle(`📍 Design Request #${requestNumber}`)
      .addFields(inputFields)
      .setTimestamp(Date.now())
      .setColor("Blurple");

    await interaction.editReply({
      embeds: [requestEmbed],
    });
  },
};
