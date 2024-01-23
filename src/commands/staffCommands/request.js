const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("request")
    .setDescription("Request something!")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("design")
        .setDescription("Request an output from the Design Department.")
    )
    .addSubcommandGroup((group) =>
      group
        .setName("finance")
        .setDescription("Request from the Finance Department")
        .addSubcommand((subcommand) =>
          subcommand
            .setName("expense-reimbursement")
            .setDescription("Request for an Expense Reimbursement.")
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("petty-cash")
            .setDescription("Request for a Petty Cash Fund.")
        )
    ),

  async execute(interaction, client) {
    const validRoles = ["1185935514042388520"];

    if (
      !interaction.member.roles.cache.some((r) => validRoles.includes(r.id))
    ) {
      await interaction.reply({
        content: `🔴 ERROR: This command can only be used by <@&1185935514042388520>.`,
        ephemeral: true,
      });
      return;
    }

    const channel = interaction.channelId;
    const subcommand = interaction.options.getSubcommand();

    let modal;
    switch (subcommand) {
      case "design":
        if (channel !== "1194304369001250945") {
          await interaction.reply({
            content: `🔴 ERROR: This command can only be used on <#1194304369001250945>.`,
            ephemeral: true,
          });
          return;
        }

        modal = buildDesignRequestModal();
        break;
      case "expense-reimbursement":
        if (channel !== "1199308426166153278") {
          await interaction.reply({
            content: `🔴 ERROR: This command can only be used on <#1199308426166153278>.`,
            ephemeral: true,
          });
          return;
        }

        modal = buildFinanceModal();
        modal
          .setCustomId("financeReimbursementRequest")
          .setTitle("Expense Reimbursement Request");
        break;
      case "petty-cash":
        if (channel !== "1199308856153620540") {
          await interaction.reply({
            content: `🔴 ERROR: This command can only be used on <#1199308856153620540>.`,
            ephemeral: true,
          });
          return;
        }

        modal = buildFinanceModal();
        modal
          .setCustomId("financePettyCashRequest")
          .setTitle("Petty Cash Fund Request");
        break;

      default:
        break;
    }

    await interaction.showModal(modal);

    function buildDesignRequestModal() {
      const modal = new ModalBuilder();

      modal
        .setCustomId("coreDesignRequest")
        .setTitle(`Request to the Design Department`);

      const first = new TextInputBuilder()
        .setCustomId(`requestInput`)
        .setLabel(`Request Details`)
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder("Explain your request in a detailed manner.")
        .setRequired(true);

      const second = new TextInputBuilder()
        .setCustomId(`reference1`)
        .setLabel(`Reference #1`)
        .setPlaceholder("(OPTIONAL) Reference link of your request.")
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

      const third = new TextInputBuilder()
        .setCustomId(`reference2`)
        .setLabel(`Reference #2`)
        .setPlaceholder("(OPTIONAL) Additional reference link.")
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

      const fourth = new TextInputBuilder()
        .setCustomId(`reference3`)
        .setLabel(`Reference #3`)
        .setPlaceholder("(OPTIONAL) Additional reference link.")
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

      const firstRow = new ActionRowBuilder().addComponents(first);
      const secondRow = new ActionRowBuilder().addComponents(second);
      const thirdRow = new ActionRowBuilder().addComponents(third);
      const fourthRow = new ActionRowBuilder().addComponents(fourth);

      modal.addComponents(firstRow, secondRow, thirdRow, fourthRow);

      return modal;
    }

    function buildFinanceModal() {
      const modal = new ModalBuilder();

      const first = new TextInputBuilder()
        .setCustomId(`referenceInput`)
        .setLabel(`Reference Code`)
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("Dept Code-Year-Number (E.g WD-2024-0001).")
        .setRequired(true);

      const second = new TextInputBuilder()
        .setCustomId(`amountInput`)
        .setLabel(`Request Amount`)
        .setPlaceholder("The requested amount in PHP.")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const third = new TextInputBuilder()
        .setCustomId(`bankInput`)
        .setLabel(`Bank Name`)
        .setPlaceholder("The name of the bank of the receiving account.")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const fourth = new TextInputBuilder()
        .setCustomId(`accountNameInput`)
        .setLabel(`Account Name`)
        .setPlaceholder("The name of the receiving bank account.")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const fifth = new TextInputBuilder()
        .setCustomId(`accountNumberInput`)
        .setLabel(`Account Number`)
        .setPlaceholder("The account number of the receiving bank account.")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const firstRow = new ActionRowBuilder().addComponents(first);
      const secondRow = new ActionRowBuilder().addComponents(second);
      const thirdRow = new ActionRowBuilder().addComponents(third);
      const fourthRow = new ActionRowBuilder().addComponents(fourth);
      const fifthRow = new ActionRowBuilder().addComponents(fifth);

      modal.addComponents(firstRow, secondRow, thirdRow, fourthRow, fifthRow);

      return modal;
    }
  },
};
