const {
  ActionRowBuilder,
  MessageFlags,
  EmbedBuilder,
  ButtonStyle,
  ButtonBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

const hrRole = "1314815153421680640";

module.exports = {
  data: {
    name: `approveInterimDuty`,
  },
  async execute(interaction, client) {
    let messageEmbed = interaction.message.embeds[0];

    const replyEmbed = new EmbedBuilder();

    const ownerFieldNames = ["Submitted By"];

    const mentionableMembers = messageEmbed.data.fields
      .filter((f) => ownerFieldNames.includes(f.name))
      .map((f) => f.value)
      .join("\n");

    if (!interaction.member.roles.cache.has(hrRole)) {
      replyEmbed
        .setDescription(`🔴 ERROR: You cannot use this button.`)
        .setColor("Red");

      return await interaction.reply({
        embeds: [replyEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }

    const modal = new ModalBuilder()
      .setCustomId(`approveInterimRequest_${interaction.id}`)
      .setTitle(`Add Planning Shift`);

    const details = new TextInputBuilder()
      .setCustomId(`planningShiftId`)
      .setLabel(`Planning Shift ID`)
      .setPlaceholder(`Add the planning shift ID.`)
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const firstRow = new ActionRowBuilder().addComponents(details);
    modal.addComponents(firstRow);
    await interaction.showModal(modal);

    const modalResponse = await interaction.awaitModalSubmit({
      filter: async (i) => {
        const f =
          i.customId === `approveInterimRequest_${interaction.id}` &&
          i.user.id === interaction.user.id;

        if (f) {
          await i.deferUpdate();
        }
        return f;
      },
      time: 120000,
    });

    try {
      if (modalResponse.isModalSubmit()) {
        const categoryId = messageEmbed.data.fields.find(
          (f) => f.name === "Branch ID"
        )?.value;
        const approvedBy = interaction.member.nickname.replace(
          /^[🔴🟢]\s*/,
          ""
        );

        const category = await interaction.guild.channels.fetch(categoryId);

        let scheduleChannel = null;

        try {
          if (category && category.type === 4) {
            const childChannels = category.children.cache;

            scheduleChannel = childChannels.find((channel) =>
              channel.name.toLowerCase().includes("schedule")
            );

            if (!scheduleChannel) {
              throw new Error("No schedule channel found in the category");
            }
          } else {
            throw new Error(
              `Channel with ID ${categoryId} is not a category or doesn't exist`
            );
          }
        } catch (error) {
          console.error(`Error finding schedule channel: ${error.message}`);
          replyEmbed
            .setDescription(
              `🔴 ERROR: An error occurred while finding the schedule channel. Please try again.`
            )
            .setColor("Red");
          return await modalResponse.followUp({
            embeds: [replyEmbed],
            flags: MessageFlags.Ephemeral,
          });
        }

        const planningShiftId =
          modalResponse.fields.getTextInputValue("planningShiftId");

        const messages = await scheduleChannel.messages.fetch({ limit: 100 });
        const targetMessage = messages.find(
          (msg) => msg.content && msg.content.includes(planningShiftId)
        );

        if (!targetMessage) {
          replyEmbed
            .setDescription(
              `🔴 ERROR: No message found with planning shift ID: ${planningShiftId}`
            )
            .setColor("Red");
          return await modalResponse.followUp({
            embeds: [replyEmbed],
            flags: MessageFlags.Ephemeral,
          });
        }

        let thread = targetMessage.thread;

        if (!thread) {
          replyEmbed
            .setDescription(
              `🔴 ERROR: No thread found with planning shift ID: ${planningShiftId}`
            )
            .setColor("Red");
          return await modalResponse.followUp({
            embeds: [replyEmbed],
            flags: MessageFlags.Ephemeral,
          });
        }

        messageEmbed.data.footer = {
          text: `Approved By: ${approvedBy}`,
        };

        messageEmbed.data.color = 5763719;

        const messagePayload = {
          content: mentionableMembers,
          embeds: [messageEmbed],
        };

        await thread.send(messagePayload);

        await interaction.message.delete();

        replyEmbed
          .setDescription(
            `✅ Success. Request has been moved to the attendance thread.`
          )
          .setColor("Green");

        await modalResponse.followUp({
          embeds: [replyEmbed],
          flags: MessageFlags.Ephemeral,
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
