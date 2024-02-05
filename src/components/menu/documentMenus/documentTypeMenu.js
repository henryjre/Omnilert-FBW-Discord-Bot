const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuOptionBuilder,
  StringSelectMenuBuilder,
  ComponentType,
} = require("discord.js");

module.exports = {
  data: {
    name: `documentTypeMenu`,
  },
  async execute(interaction, client) {
    const messageEmbed = interaction.message.embeds[0];

    if (!messageEmbed.data.fields[0].value.includes(interaction.user.id)) {
      await interaction.reply({
        content: `You cannot use this menu.`,
        ephemeral: true,
      });
      return;
    }

    const buttonActionRow = new ActionRowBuilder().addComponents(
      interaction.message.components[0].components
    );

    const submitIndex = buttonActionRow.components.findIndex(
      (c) => c.data.custom_id && c.data.custom_id === "documentSign"
    );

    const selectMenu = interaction.message.components.find(
      (c) => c.components[0].data.type === 3
    );

    const selectedValue = interaction.values[0];

    await interaction.deferUpdate();

    const role = await interaction.guild.roles.cache.get("1185935514042388520");

    const membersWithRoles = role.members.map((m) =>
      new StringSelectMenuOptionBuilder()
        .setLabel(m.nickname)
        .setValue(m.user.id)
    );

    const userMenu = new StringSelectMenuBuilder()
      .setCustomId("documentUserMenu")
      .setOptions(membersWithRoles)
      .setPlaceholder("Select the signing user.");

    const typeMenu = new StringSelectMenuBuilder(selectMenu.components[0].data);

    const userRow = new ActionRowBuilder().addComponents(userMenu);
    const typeRow = new ActionRowBuilder().addComponents(typeMenu);

    const msg = await interaction.editReply({
      components: [buttonActionRow, userRow],
    });

    const collector = await msg.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 60000,
    });

    collector.on("collect", async (i) => {
      if (i.user.id !== interaction.user.id) return;

      await i.deferUpdate();

      const newEmbed = new EmbedBuilder(messageEmbed.data).addFields([
        {
          name: `⌛ ${selectedValue}`,
          value: `<@${i.values[0]}>`,
        },
      ]);

      await msg.edit({
        embeds: [newEmbed],
      });

      collector.stop();
    });

    collector.on("end", async (i) => {
      buttonActionRow.components[submitIndex].data.disabled = false;
      await msg.edit({
        components: [buttonActionRow, typeRow],
      });
    });
  },
};
