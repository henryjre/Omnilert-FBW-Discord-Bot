const {
  ActionRowBuilder,
  MessageFlags,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ButtonBuilder,
  ButtonStyle,
  TextDisplayBuilder,
} = require('discord.js');

const pesoFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

const { updateClosingPcfBalance } = require('../../../odooRpc.js');

const departments = require('../../../config/departments.json');

module.exports = {
  data: {
    name: `posPcfInput`,
  },
  async execute(interaction, client) {
    let messageEmbed = interaction.message.embeds[0];

    const department = departments.find(
      (d) => d.verificationChannel === interaction.message.channelId
    );

    const departmentId = department.id;

    const replyEmbed = new EmbedBuilder();

    const sessionField = messageEmbed.data.fields.find((f) => f.name === 'Session Name');

    const openingField = messageEmbed.data.fields.find((f) => f.name === 'Opening PCF Expected');
    const expectedField = messageEmbed.data.fields.find((f) => f.name === 'Closing PCF Expected');
    const countedField = messageEmbed.data.fields.find((f) => f.name === 'Closing PCF Counted');
    const differenceField = messageEmbed.data.fields.find(
      (f) => f.name === 'Closing PCF Difference'
    );

    const mentionedUser = interaction.message.mentions.users.first();
    const mentionedRole = interaction.message.mentions.roles.first();

    if (mentionedUser) {
      // Handle user mention
      const isNotMentionedUser = interaction.user.id !== mentionedUser.id;

      if (isNotMentionedUser) {
        replyEmbed.setDescription(`🔴 ERROR: You cannot use this button.`).setColor('Red');

        return await interaction.reply({
          embeds: [replyEmbed],
          flags: MessageFlags.Ephemeral,
        });
      }
    } else if (mentionedRole) {
      // Handle role mention
      const doesNotHaveRole = !interaction.member.roles.cache.has(mentionedRole.id);

      if (doesNotHaveRole) {
        replyEmbed.setDescription(`🔴 ERROR: You cannot use this button.`).setColor('Red');

        return await interaction.reply({
          embeds: [replyEmbed],
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    const modal = new ModalBuilder()
      .setCustomId(`pcfInput_${interaction.id}`)
      .setTitle(`Input PCF Report`);

    const textDisplay = new TextDisplayBuilder().setContent(
      `## Input numbers only!\nExample: 325 | 325.53`
    );

    const opening = new TextInputBuilder()
      .setCustomId(`openingExpected`)
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const openingLabel = new LabelBuilder()
      .setLabel('Opening PCF Expected')
      .setTextInputComponent(opening);

    const expected = new TextInputBuilder()
      .setCustomId(`closingExpected`)
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const expectedLabel = new LabelBuilder()
      .setLabel('Closing PCF Expected')
      .setTextInputComponent(expected);

    const counted = new TextInputBuilder()
      .setCustomId(`closingCounted`)
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const countedLabel = new LabelBuilder()
      .setLabel('Closing PCF Counted')
      .setTextInputComponent(counted);

    modal
      .addTextDisplayComponents(textDisplay)
      .addLabelComponents(openingLabel, expectedLabel, countedLabel);
    await interaction.showModal(modal);

    const modalResponse = await interaction.awaitModalSubmit({
      filter: async (i) => {
        const f = i.customId === `pcfInput_${interaction.id}` && i.user.id === interaction.user.id;

        if (f) {
          await i.deferUpdate();
        }
        return f;
      },
      time: 300000,
    });

    try {
      if (modalResponse.isModalSubmit()) {
        const opening = modalResponse.fields.getTextInputValue('openingExpected');
        const expected = modalResponse.fields.getTextInputValue('closingExpected');
        const counted = modalResponse.fields.getTextInputValue('closingCounted');

        const openingParsed = parseFloat(opening);
        const expectedParsed = parseFloat(expected);
        const countedParsed = parseFloat(counted);

        if (isNaN(openingParsed) || isNaN(expectedParsed) || isNaN(countedParsed)) {
          return await modalResponse.followUp({
            content: `🔴 ERROR: Please make sure to only input numbers without letters in the input fields.`,
            flags: MessageFlags.Ephemeral,
          });
        }

        const pesoOpening = pesoFormatter.format(openingParsed);
        const pesoExpected = pesoFormatter.format(expectedParsed);
        const pesoCounted = pesoFormatter.format(countedParsed);

        const difference = countedParsed - expectedParsed;

        let pesoDifference = pesoFormatter.format(difference);
        if (difference < 0) {
          pesoDifference = `-${pesoFormatter.format(Math.abs(difference))}`;
        } else {
          pesoDifference = `+${pesoFormatter.format(difference)}`;
        }

        const sessionName = sessionField.value;

        openingField.value = pesoOpening;
        expectedField.value = pesoExpected;
        countedField.value = pesoCounted;
        differenceField.value = pesoDifference;

        messageEmbed.data.footer = {
          text: `Input By: ${interaction.member.nickname.replace(/^[🔴🟢]\s*/, '')}\n\u200b`,
        };

        const confirm = new ButtonBuilder()
          .setCustomId('posOrderVerificationConfirm')
          .setLabel('Confirm')
          .setStyle(ButtonStyle.Success);

        const inputButton = new ButtonBuilder()
          .setCustomId('posPcfInput')
          .setLabel('Edit Input')
          .setStyle(ButtonStyle.Secondary);

        const buttonRow = new ActionRowBuilder().addComponents(confirm, inputButton);

        await interaction.message.edit({
          embeds: [messageEmbed],
          components: [buttonRow],
        });

        await updateClosingPcfBalance(countedParsed, departmentId, sessionName);
      }
    } catch (error) {
      console.log(error);
      await modalResponse.followUp({
        content: `🔴 ERROR: An error occurred while creating your signature request. Please try again.`,
        flags: MessageFlags.Ephemeral,
      });

      return;
    }
  },
};
