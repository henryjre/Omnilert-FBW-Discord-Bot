const {
  ActionRowBuilder,
  MessageFlags,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

module.exports = {
  data: {
    name: `cashBreakdown`,
  },
  async execute(interaction, client) {
    // 1. Extract denomination from customId
    const denomId = interaction.customId.split("_")[1]; // e.g., "500"
    const denomValue = parseFloat(denomId);
    const denomLabel = `${denomValue.toFixed(2)} ₱`;

    // 2. Parse current embed description for existing breakdown
    const embed = EmbedBuilder.from(interaction.message.embeds[0]);

    const staticHeader = "## 📝 Opening Cash Breakdown";
    let description = embed.data.description || staticHeader;

    let breakdown = description.replace(staticHeader, "").trim();
    if (breakdown.startsWith(">>> *") && breakdown.endsWith("*")) {
      breakdown = breakdown.slice(5, -1).trim(); // Remove >>> * and trailing *
    }

    const lines = breakdown
      ? breakdown
          .split("\n")
          .filter((line) => line && !line.startsWith("Total:"))
      : [];

    // 3. Find current quantity for this denomination (if any)
    let currentQty = "";
    const regex = new RegExp(`^(\\d+) x ${denomValue.toFixed(2)} ₱$`);
    for (const line of lines) {
      const match = line.match(regex);
      if (match) {
        currentQty = match[1];
        break;
      }
    }

    // 4. Show modal to ask for quantity
    const modal = new ModalBuilder()
      .setCustomId(`cashBreakdownModal_${denomId}_${interaction.id}`)
      .setTitle(`Enter quantity for ${denomLabel}`);

    const qtyInput = new TextInputBuilder()
      .setCustomId("denomQty")
      .setLabel(`How many ${denomLabel}?`)
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setPlaceholder("Enter quantity (0 to remove)")
      .setValue(currentQty);

    modal.addComponents(new ActionRowBuilder().addComponents(qtyInput));
    await interaction.showModal(modal);

    const modalResponse = await interaction.awaitModalSubmit({
      filter: async (i) => {
        const f =
          i.customId === `cashBreakdownModal_${denomId}_${interaction.id}` &&
          i.user.id === interaction.user.id;

        if (f) {
          await i.deferUpdate();
        }
        return f;
      },
      time: 300000,
    });

    try {
      if (modalResponse.isModalSubmit()) {
        const qty = parseInt(
          modalResponse.fields.getTextInputValue("denomQty"),
          10
        );

        if (isNaN(qty) || qty < 0) {
          return await modalResponse.followUp({
            content: "Please enter a valid non-negative number.",
            flags: MessageFlags.Ephemeral,
          });
        }

        const interactedMember = interaction.member.nickname.replace(
          /^[🔴🟢]\s*/,
          ""
        );

        embed.setFooter({
          text: `Input by: ${interactedMember}`,
        });

        // 6. Update breakdown lines
        let newLines = lines.filter((line) => !regex.test(line));
        if (qty > 0) {
          newLines.push(`${qty} x ${denomValue.toFixed(2)} ₱`);
        }

        // 7. Sort lines by denomination value descending
        newLines.sort((a, b) => {
          const aVal = parseFloat(a.split(" x ")[1]);
          const bVal = parseFloat(b.split(" x ")[1]);
          return bVal - aVal;
        });

        // 8. Calculate total
        let total = 0;
        for (const line of newLines) {
          if (!line.includes(" x ")) continue;
          const [qtyStr, rest] = line.split(" x ");
          if (!rest) continue;
          const [valStr] = rest.split(" ");
          total += parseInt(qtyStr, 10) * parseFloat(valStr);
        }

        // 9. Build new description
        let newDescription = "";
        if (newLines.length > 0) {
          newDescription +=
            newLines.join("\n") +
            `\nTotal: ${total.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })} ₱`;
        } else {
          newDescription += `Total: 0.00 ₱`;
        }

        const cashCountedField = embed.data.fields.find(
          (f) =>
            f.name === "Opening Cash Counted" ||
            f.name === "Opening PCF Counted"
        );

        if (cashCountedField) {
          cashCountedField.value = pesoFormatter.format(total);
        }

        embed.setDescription(`${staticHeader}\n\n>>> *${newDescription}*`);

        await interaction.message.edit({
          embeds: [embed],
          components: interaction.message.components,
        });
      }
    } catch (error) {
      console.log(error);
      await modalResponse.followUp({
        content: `🔴 ERROR: An error occurred while creating your signature request. Please try again.`,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
