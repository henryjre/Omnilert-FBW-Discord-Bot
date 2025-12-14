const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  SlashCommandBuilder,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder().setName('cdr_data'),
  pushToArray: false,
  async execute(interaction, client, modalResponse, attachmentFile) {
    const dateInput = modalResponse.fields.getTextInputValue('dateInput');
    const branchInput = modalResponse.fields.getTextInputValue('branchInput');
    const employeesInput = modalResponse.fields.getTextInputValue('employeesInput');
    const reasonInput = modalResponse.fields.getTextInputValue('reasonInput');
    const amountInput = modalResponse.fields.getTextInputValue('amountInput');

    const parsedAmount = extractDigits(amountInput);

    const interactionMember = interaction.member?.toString() || interaction.user.toString();

    const authRequestEmbed = new EmbedBuilder()
      .setDescription(`## 📥 CASH DEPOSIT REQUEST`)
      .addFields([
        {
          name: 'Date',
          value: `📆 | ${dateInput}`,
        },
        {
          name: 'Branch',
          value: `🛒 | ${branchInput}`,
        },
        {
          name: 'Amount',
          value: `💵 | ${parsedAmount}`,
        },
        {
          name: 'Employees On Duty',
          value: `${employeesInput}`,
        },
        {
          name: 'Reason',
          value: `❓ | ${reasonInput}`,
        },
        {
          name: 'Requested By',
          value: `${interactionMember}`,
        },
      ])
      // .setFooter({
      //   iconURL: interaction.user.displayAvatarURL(),
      //   text: `Submitted by: ${interactionMember}`,
      // })
      .setColor('#f3ff00'); // f3ff00 when approved

    const confirmButton = new ButtonBuilder()
      .setCustomId('confirmAuthRequest')
      .setLabel('Confirm')
      .setStyle(ButtonStyle.Success);
    const cancelButton = new ButtonBuilder()
      .setCustomId('cancelAuthRequest')
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Danger);

    const buttonRow = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

    const messagePayload = {
      embeds: [authRequestEmbed],
      components: [buttonRow],
    };

    if (attachmentFile) {
      messagePayload.files = [attachmentFile];
    }

    await interaction.followUp(messagePayload);
  },
};

function extractDigits(input) {
  try {
    if (typeof input !== 'string') return input; // Return original if not a string

    // Extract a valid number (including thousands separators)
    const match = input.match(/[\d,]+(\.\d{0,2})?/);
    if (!match) return input; // Return input if no valid number found

    // Remove commas and convert to a number
    const amount = parseFloat(match[0].replace(/,/g, '')).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return `₱${amount}`; // Return properly formatted amount
  } catch (error) {
    return input; // Return original string if an error occurs
  }
}
