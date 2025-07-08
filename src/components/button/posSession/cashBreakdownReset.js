const { EmbedBuilder } = require("discord.js");

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

module.exports = {
  data: {
    name: "cashBreakdownReset",
  },
  async execute(interaction, client) {
    if (interaction.message.embeds[0].data.footer.text.includes("Reset by:")) {
      return await interaction.update({
        embeds: interaction.message.embeds,
        components: interaction.message.components,
      });
    }

    const embedDescription = interaction.message.embeds[0].data.description;

    let staticHeader;
    if (embedDescription.includes("Opening PCF")) {
      staticHeader = "## 💰 Opening PCF Breakdown";
    } else if (embedDescription.includes("Opening Cash")) {
      staticHeader = "## 📝 Opening Cash Breakdown";
    } else if (embedDescription.includes("Closing PCF")) {
      staticHeader = "## 💰 Closing PCF Breakdown";
    } else if (embedDescription.includes("Closing Cash")) {
      staticHeader = "## 📝 Closing Cash Breakdown";
    } else if (embedDescription.includes("PCF Report")) {
      staticHeader = "## 📝 PCF Report";
    }

    const resetDescription = `${staticHeader}\n\n>>> *Total: 0.00 ₱*`;
    const interactedMember = interaction.member.nickname.replace(
      /^[🔴🟢]\s*/,
      ""
    );

    const embed = EmbedBuilder.from(interaction.message.embeds[0]);
    embed.setDescription(resetDescription);
    embed.setFooter({
      text: `Cash breakdown has been reset. Please input the cash breakdown details by selecting the denomination below and inputting the amount.\n\nReset by: ${interactedMember}`,
    });

    const cashCountedField = embed.data.fields.find(
      (f) =>
        f.name.includes("Opening Cash Counted") ||
        f.name.includes("Opening PCF Counted") ||
        f.name.includes("Closing PCF Counted")
    );

    const cashExpectedField = embed.data.fields.find(
      (f) =>
        f.name.includes("Opening Cash Expected") ||
        f.name.includes("Closing PCF Expected")
    );

    const cashDifferenceField = embed.data.fields.find(
      (f) =>
        f.name.includes("Opening Cash Difference") ||
        f.name.includes("Closing PCF Difference")
    );

    if (cashCountedField) {
      cashCountedField.value = pesoFormatter.format(0);
    }

    if (cashDifferenceField) {
      const cashExpectedValue = extractPesoValue(cashExpectedField.value);
      cashDifferenceField.value = pesoFormatter.format(0 - cashExpectedValue);
    }

    await interaction.update({
      embeds: [embed],
      components: interaction.message.components,
    });
  },
};

function extractPesoValue(currencyStr) {
  // Remove the peso sign and commas, then trim whitespace
  const numericStr = currencyStr.replace("₱", "").replace(/,/g, "").trim();
  // Parse as float
  const value = parseFloat(numericStr);
  if (isNaN(value)) {
    throw new Error(`Invalid currency string: "${currencyStr}"`);
  }
  return value;
}
