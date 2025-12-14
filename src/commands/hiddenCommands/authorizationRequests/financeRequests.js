const {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  MessageFlags,
  LabelBuilder,
} = require('discord.js');

const requestType = [
  {
    name: '💳 PAYMENT',
    value: 'payment',
    color: '#000eff',
  },
  {
    name: '💰 REPLENISHMENT',
    value: 'replenishment',
    color: '#ffb700',
  },
];

const financeRole = '1314815202679590984';

module.exports = {
  data: new SlashCommandBuilder().setName('finance_request'),
  pushToArray: false,
  async execute(interaction, client, option) {
    if (!interaction.member.roles.cache.has(financeRole)) {
      const replyEmbed = new EmbedBuilder()
        .setDescription(`🔴 ERROR: Only <@&1314815202679590984> can use this command.`)
        .setColor('Red');

      return await interaction.reply({
        embeds: [replyEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }
    const type = requestType.find((t) => t.value === option);

    const modal = await buildModal(interaction, type);
    await interaction.showModal(modal);

    const modalResponse = await interaction.awaitModalSubmit({
      filter: async (i) => {
        const isValid =
          i.customId === `modal_${type.value}_${interaction.id}` &&
          i.user.id === interaction.user.id;

        if (!isValid) return false;

        await i.deferUpdate();
        return true;
      },
      time: 300000,
    });

    try {
      if (modalResponse.isModalSubmit()) {
        return await client.commands
          .get('finance_request_data')
          .execute(interaction, client, type, modalResponse);
      }
    } catch (error) {
      console.log(error);
      await interaction.followUp({
        content: '❌ An error occurred while processing your request.',
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

async function buildModal(interaction, type) {
  const modal = new ModalBuilder()
    .setCustomId(`modal_${type.value}_${interaction.id}`)
    .setTitle(`${type.name} REQUEST`);

  const firstInput = new TextInputBuilder()
    .setCustomId(`referenceNumber`)
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(100);

  const firstLabel = new LabelBuilder()
    .setLabel('🔗 Reference Number')
    .setDescription('Enter the reference number/digits.')
    .setTextInputComponent(firstInput);

  const secondInput = new TextInputBuilder()
    .setCustomId(`requestedAmount`)
    .setStyle(TextInputStyle.Short)
    .setMaxLength(100)
    .setRequired(true);

  const secondLabel = new LabelBuilder()
    .setLabel('💲 Requested Amount')
    .setDescription('Enter the amount requested.')
    .setTextInputComponent(secondInput);

  const thirdInput = new TextInputBuilder()
    .setCustomId(`bankNameInput`)
    .setStyle(TextInputStyle.Short)
    .setMaxLength(100)
    .setRequired(true);

  const thirdLabel = new LabelBuilder()
    .setLabel('🏛️ Bank Name')
    .setDescription('Enter the name of the bank.')
    .setTextInputComponent(thirdInput);

  const fourthInput = new TextInputBuilder()
    .setCustomId(`accountNameInput`)
    .setStyle(TextInputStyle.Short)
    .setMaxLength(100)
    .setRequired(true);

  const fourthLabel = new LabelBuilder()
    .setLabel('👤 Account Name')
    .setDescription('Enter the name of the bank account.')
    .setTextInputComponent(fourthInput);

  const fifthInput = new TextInputBuilder()
    .setCustomId(`accountNumberInput`)
    .setStyle(TextInputStyle.Short)
    .setMaxLength(100)
    .setRequired(true);

  const fifthLabel = new LabelBuilder()
    .setLabel('🔢 Account Number')
    .setDescription('Enter the account number of the bank account.')
    .setTextInputComponent(fifthInput);

  modal.addLabelComponents(firstLabel, secondLabel, thirdLabel, fourthLabel, fifthLabel);
  return modal;
}
