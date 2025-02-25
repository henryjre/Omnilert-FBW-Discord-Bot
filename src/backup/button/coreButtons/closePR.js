const { ButtonBuilder, ActionRowBuilder } = require("discord.js");

module.exports = {
  data: {
    name: `closePR`,
  },
  async execute(interaction, client) {
    const interactionMember = interaction.guild.members.cache.get(
      interaction.user.id
    );
    if (!interactionMember.roles.cache.has("1174612428206641182")) {
      await interaction.reply({
        content: `You cannot use this button.`,
        ephemeral: true,
      });
      return;
    }

    await interaction.deferUpdate();

    const messageEmbed = interaction.message.embeds[0].data;

    messageEmbed.fields.push({
      name: "Closed By",
      value: interactionMember.toString(),
    });

    messageEmbed.color = 15548997;
    messageEmbed.author.name = "Closed";

    const components = interaction.message.components[0].components;
    const linkButton = new ButtonBuilder(components[1].data).setLabel(
      "PR Files"
    );
    const newButtonRow = new ActionRowBuilder().addComponents(linkButton);

    await interaction.editReply({
      embeds: [messageEmbed],
      components: [newButtonRow],
    });
  },
};
