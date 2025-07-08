const {
  SlashCommandBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  EmbedBuilder,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("test")
    .setDescription("Testing purposes!"),
  async execute(interaction, client) {
    const embed = new EmbedBuilder()
      .setURL("https://omnilert.odoo.com/")
      .setDescription("## 📝 Opening Change Fund Breakdown")
      .addFields({
        name: "Opening Cash Counted",
        value: "₱0.00",
      })
      .setColor("Green")
      .setFooter({
        text: "Add change fund breakdown details by selecting the denomination below and inputting the amount.",
      });

    const confirm = new ButtonBuilder()
      .setCustomId("posOrderVerificationConfirm")
      .setLabel("Confirm")
      .setStyle(ButtonStyle.Success);

    const reset = new ButtonBuilder()
      .setCustomId("cashBreakdownReset")
      .setLabel("Reset")
      .setStyle(ButtonStyle.Danger);

    const buttonRow = new ActionRowBuilder().addComponents(confirm, reset);

    const denominations = [
      { label: "₱1000", id: "1000" },
      { label: "₱500", id: "500" },
      { label: "₱200", id: "200" },
      { label: "₱100", id: "100" },
      { label: "₱50", id: "50" },
      { label: "₱20", id: "20" },
      { label: "₱10", id: "10" },
      { label: "₱5", id: "5" },
      { label: "₱1", id: "1" },
    ];

    const denomButtonRows = [];
    for (let i = 0; i < denominations.length; i += 3) {
      const row = new ActionRowBuilder();
      row.addComponents(
        ...denominations
          .slice(i, i + 3)
          .map((denom) =>
            new ButtonBuilder()
              .setCustomId(`cashBreakdown_${denom.id}`)
              .setLabel(denom.label)
              .setStyle(ButtonStyle.Primary)
          )
      );
      denomButtonRows.push(row);
    }

    await interaction.reply({
      embeds: [embed],
      components: [...denomButtonRows, buttonRow],
    });
  },
};
