const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("test")
    .setDescription("Returns an embed."),
  async execute(interaction, client) {
    return;

    let embeds = [];
    for (let i = 0; i < 10; i++) {
      const embed = new EmbedBuilder()
        .setTitle("EMBED")
        .setDescription("An embed description")
        .setColor("Gold")
        .setImage(client.user.displayAvatarURL())
        .setThumbnail(client.user.displayAvatarURL())
        .setTimestamp(Date.now())
        .setAuthor({
          iconURL: interaction.user.displayAvatarURL(),
          name: interaction.user.tag,
        })
        .setFooter({
          iconURL: client.user.displayAvatarURL(),
          text: client.user.tag,
        })
        .addFields([
          {
            name: `Field 1`,
            value: interaction.user.toString(),
            inline: true,
          },
          {
            name: `Field 2`,
            value: `Value 2`,
            inline: true,
          },
        ]);

      embeds.push(embed);
    }

    await shenonUser.send({
      embeds: embeds,
    });

    return;

    const embed = new EmbedBuilder()
      .setTitle("EMBED")
      .setDescription("An embed description")
      .setColor("Gold")
      .setImage(client.user.displayAvatarURL())
      .setThumbnail(client.user.displayAvatarURL())
      .setTimestamp(Date.now())
      .setAuthor({
        iconURL: interaction.user.displayAvatarURL(),
        name: interaction.user.tag,
      })
      .setFooter({
        iconURL: client.user.displayAvatarURL(),
        text: client.user.tag,
      })
      .addFields([
        {
          name: `Field 1`,
          value: interaction.user.toString(),
          inline: true,
        },
        {
          name: `Field 2`,
          value: `Value 2`,
          inline: true,
        },
      ]);

    await interaction.reply({
      embeds: [embed],
    });
  },
};
