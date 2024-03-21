const {
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ActionRowBuilder,
} = require("discord.js");

module.exports = {
  data: {
    name: `addAuthor`,
  },
  async execute(interaction, client) {
    if (interaction.message.interaction.user.id !== interaction.user.id) {
      await interaction.reply({
        content: `You cannot use this button.`,
        ephemeral: true,
      });
      return;
    }

    await interaction.deferUpdate();

    const execsAndBoards = ["1185935514042388520", "1196806310524629062"];
    const roles = await interaction.guild.roles.cache.filter((r) =>
      execsAndBoards.includes(r.id)
    );

    const membersMap = new Map();

    roles.each((role) => {
      role.members.each((m) => {
        if (!membersMap.has(m.user.id)) {
          membersMap.set(m.user.id, { id: m.user.id, nickname: m.nickname });
        }
      });
    });

    const memberOptions = Array.from(membersMap.values()).map((m) =>
      new StringSelectMenuOptionBuilder().setLabel(m.nickname).setValue(m.id)
    );

    const userMenu = new StringSelectMenuBuilder()
      .setCustomId("proposalAuthorMenu")
      .setOptions(memberOptions)
      .setPlaceholder("Select the author/s of this proposal.");

    const backButton = new ButtonBuilder()
      .setCustomId("proposalBackButton")
      .setLabel("Back")
      .setStyle(ButtonStyle.Secondary);

    const buttonRow = new ActionRowBuilder().addComponents(backButton);
    const menuRow = new ActionRowBuilder().addComponents(userMenu);

    await interaction.editReply({
      components: [buttonRow, menuRow],
    });
  },
};
