const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("embed")
    .setDescription("Returns an embed."),
  async execute(interaction, client) {

    const message = await interaction.channel.messages.fetch("1201510638980186153");
    console.log(message)
    const anotherMessage = await interaction.channel.messages.fetch("1201483174178467933");
    console.log(anotherMessage)
    return


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
