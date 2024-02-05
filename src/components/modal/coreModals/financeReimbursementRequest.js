const {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} = require("discord.js");

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

module.exports = {
  data: {
    name: "financeReimbursementRequest",
  },
  async execute(interaction, client) {
    const member = interaction.guild.members.cache.get(interaction.user.id);

    const amount = interaction.fields.getTextInputValue("amountInput");

    const amountCheck = Number(amount);

    if (isNaN(amountCheck)) {
      await interaction.reply({
        content: `🔴 ERROR: Request not submitted. Please enter a valid number for the amount **\`e.g. 100 / 50 / 1200 / 10000\`**.`,
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply();

    const keyMappings = {
      referenceInput: "Reference Code",
      amountInput: "Requested Amount",
      bankInput: "Bank Name",
      accountNameInput: "Account Name",
      accountNumberInput: "Account Number",
    };

    const inputFields = Array.from(
      interaction.fields.fields,
      ([key, value]) => {
        const newKey = keyMappings[key] || key;
        if (value.value !== "") {
          if (key === "amountInput") {
            return {
              name: newKey,
              value: pesoFormatter.format(Number(value.value)),
            };
          } else {
            return { name: newKey, value: value.value };
          }
        }
        return null;
      }
    ).filter(Boolean);

    inputFields.unshift({ name: "Requested By", value: member.toString() });

    const requestEmbed = new EmbedBuilder()
      .setTitle(`📄 Expense Reimbursement Request`)
      .addFields(inputFields)
      .setTimestamp(Date.now())
      .setColor("#a020f0");

    const submit = new ButtonBuilder()
      .setCustomId("financeRequestApprove")
      .setLabel("Approve")
      .setStyle(ButtonStyle.Success);

    const cancel = new ButtonBuilder()
      .setCustomId("financeRequestReject")
      .setLabel("Reject")
      .setStyle(ButtonStyle.Danger);

    const buttonRow = new ActionRowBuilder().addComponents(submit, cancel);

    await interaction.editReply({
      embeds: [requestEmbed],
      components: [buttonRow],
    });
  },
};
