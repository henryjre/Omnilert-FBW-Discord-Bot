const {
  ActionRowBuilder,
  MessageFlags,
  EmbedBuilder,
  ButtonStyle,
  ButtonBuilder,
  ChannelType,
} = require("discord.js");

const inventoryRole = "1336990783341068348";

module.exports = {
  data: {
    name: `aicDiscussButton`,
  },
  async execute(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    let messageEmbed = interaction.message.embeds[0];

    const referenceField = messageEmbed.data.fields.find(
      (f) => f.name === "AIC Reference"
    );

    const replyEmbed = new EmbedBuilder();

    if (!interaction.member.roles.cache.has(inventoryRole)) {
      replyEmbed
        .setDescription(`🔴 ERROR: You cannot use this button.`)
        .setColor("Red");

      return await interaction.reply({
        embeds: [replyEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }

    const thread = await interaction.message.startThread({
      name: `AIC Discussion | ${referenceField.value.split("|")[1]}`,
      autoArchiveDuration: 60, // Archive after 1 hour
      type: ChannelType.PublicThread, // Set to 'GuildPrivateThread' if only the user should see it
    });

    await thread.send({
      content: `This is the start of the discussion for unusual AIC discrepancy with reference ${
        referenceField.value.split("|")[1]
      }`,
    });

    const resolveButton = new ButtonBuilder()
      .setCustomId("aicResolveButton")
      .setLabel("Resolve")
      .setStyle(ButtonStyle.Success);

    const buttonRow = new ActionRowBuilder().addComponents(resolveButton);

    await interaction.message.edit({ components: [buttonRow] });

    replyEmbed
      .setDescription(`You opened a new thread ${thread}.`)
      .setColor("Green");

    await interaction.editReply({ embeds: [replyEmbed] });
  },
};
