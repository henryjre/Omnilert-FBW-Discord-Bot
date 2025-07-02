const {
  ActionRowBuilder,
  MessageFlags,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

const departments = require("../../../config/departments.json");

const managementRole = "1314413671245676685";

module.exports = {
  data: {
    name: `posOrderVerificationReject`,
  },
  async execute(interaction, client) {
    let messageEmbed = interaction.message.embeds[0];

    const replyEmbed = new EmbedBuilder();

    const sessionField = messageEmbed.data.fields.find(
      (f) => f.name === "Session Name"
    );

    const openingField = messageEmbed.data.fields.find(
      (f) => f.name === "Opening PCF Expected"
    );
    const expectedField = messageEmbed.data.fields.find(
      (f) => f.name === "Closing PCF Expected"
    );
    const countedField = messageEmbed.data.fields.find(
      (f) => f.name === "Closing PCF Counted"
    );
    const differenceField = messageEmbed.data.fields.find(
      (f) => f.name === "Closing PCF Difference"
    );

    const mentionedUser = interaction.message.mentions.users.first();
    const mentionedRole = interaction.message.mentions.roles.first();

    if (mentionedUser) {
      // Handle user mention
      const isNotMentionedUser = interaction.user.id !== mentionedUser.id;

      if (isNotMentionedUser) {
        replyEmbed
          .setDescription(`🔴 ERROR: You cannot use this button.`)
          .setColor("Red");

        return await interaction.reply({
          embeds: [replyEmbed],
          flags: MessageFlags.Ephemeral,
        });
      }
    } else if (mentionedRole) {
      // Handle role mention
      const doesNotHaveRole = !interaction.member.roles.cache.has(
        mentionedRole.id
      );

      if (doesNotHaveRole) {
        replyEmbed
          .setDescription(`🔴 ERROR: You cannot use this button.`)
          .setColor("Red");

        return await interaction.reply({
          embeds: [replyEmbed],
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    const modal = new ModalBuilder()
      .setCustomId(`pcfInput_${interaction.id}`)
      .setTitle(`Input PCF Report`);

    const opening = new TextInputBuilder()
      .setCustomId(`openingExpected`)
      .setLabel(`OPENING`)
      .setPlaceholder(`Input numbers only EG. 325 | 325.53`)
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const expected = new TextInputBuilder()
      .setCustomId(`closingExpected`)
      .setLabel(`EXPECTED`)
      .setPlaceholder(`Input numbers only EG. 325 | 325.53`)
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const counted = new TextInputBuilder()
      .setCustomId(`closingCounted`)
      .setLabel(`COUNTED`)
      .setPlaceholder(`Input numbers only EG. 325 | 325.53`)
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const firstRow = new ActionRowBuilder().addComponents(opening);
    const secondRow = new ActionRowBuilder().addComponents(expected);
    const thirdRow = new ActionRowBuilder().addComponents(counted);

    modal.addComponents(firstRow, secondRow, thirdRow);
    await interaction.showModal(modal);

    const modalResponse = await interaction.awaitModalSubmit({
      filter: async (i) => {
        const f =
          i.customId === `pcfInput_${interaction.id}` &&
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
        const opening =
          modalResponse.fields.getTextInputValue("openingExpected");
        const expected =
          modalResponse.fields.getTextInputValue("closingExpected");
        const counted =
          modalResponse.fields.getTextInputValue("closingCounted");

        const openingParsed = parseFloat(opening);
        const expectedParsed = parseFloat(expected);
        const countedParsed = parseFloat(counted);

        if (
          isNaN(openingParsed) ||
          isNaN(expectedParsed) ||
          isNaN(countedParsed)
        ) {
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

        const department = departments.find(
          (d) => d.verificationChannel === interaction.message.channelId
        );

        const posChannel = client.channels.cache.get(department.posChannel);

        const sessionMessage = await posChannel.messages
          .fetch({ limit: 100 })
          .then((messages) =>
            messages.find((msg) => msg.content.includes(sessionName))
          );

        const posThread = await sessionMessage.thread;

        if (!posThread) {
          return await modalResponse.followUp({
            content: `🔴 ERROR: No thread found.`,
            flags: MessageFlags.Ephemeral,
          });
        }

        messageEmbed.data.footer = {
          text: `Input By: ${interaction.member.nickname.replace(
            /^[🔴🟢]\s*/,
            ""
          )}\n\u200b`,
        };

        const submit = new ButtonBuilder()
          .setCustomId("posOrderAudit")
          .setLabel("Audit")
          .setStyle(ButtonStyle.Primary);

        const buttonRow = new ActionRowBuilder().addComponents(submit);

        await posThread.send({
          embeds: [messageEmbed],
          components: [buttonRow],
        });

        try {
          await interaction.message.delete();

          if (interaction.message.thread) {
            await interaction.message.thread.delete();
          }
        } catch (error) {
          console.error("Error deleting messages:", error);
          await interaction.followUp({
            content:
              "🔴 ERROR: Failed to clean up messages. Please contact an administrator.",
            flags: MessageFlags.Ephemeral,
          });
        }
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
