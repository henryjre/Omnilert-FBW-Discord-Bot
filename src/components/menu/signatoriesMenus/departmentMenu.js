const {
  EmbedBuilder,
  MessageFlags,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} = require("discord.js");

const management = require("../../../config/management.json");

module.exports = {
  data: {
    name: `signatoriesDepartmentMenu`,
  },
  async execute(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const replyEmbed = new EmbedBuilder();

    let allEmbeds = interaction.message.embeds;
    const messageEmbed = allEmbeds[0];

    // Check field limit before insertion
    if (messageEmbed.data.fields.length >= 25) {
      replyEmbed
        .setDescription(
          `🔴 ERROR: Cannot add more departments. This signatory has reached the maximum signing parties that can be added.`
        )
        .setColor("Red");

      return await interaction.editReply({ embeds: [replyEmbed] });
    }

    if (
      !messageEmbed.data.fields
        .find((f) => f.name === "Prepared By")
        .value.includes(interaction.user.id)
    ) {
      replyEmbed
        .setDescription(`🔴 ERROR: You cannot use this menu.`)
        .setColor("Red");

      return await interaction.editReply({ embeds: [replyEmbed] });
    }

    const selectedDepartments = interaction.values;

    for (const department of selectedDepartments) {
      const dept = management.find(
        (dept) => dept.officeChannelId === department
      );
      const departmentName = dept.name;
      const departmentRole = dept.role;
      const departmentOfficeChannelId = dept.officeChannelId;

      const departmentField = messageEmbed.data.fields.find(
        (f) => f.name === departmentName
      );

      if (!departmentField) {
        if (departmentName === "Executive Head") {
          messageEmbed.data.fields.push({
            name: departmentName,
            value: `${departmentOfficeChannelId} - <@&${departmentRole}> - To be signed ⌛`,
          });
        } else {
          const executiveHeadIndex = messageEmbed.data.fields.findIndex(
            (f) => f.name === "Executive Head"
          );

          if (executiveHeadIndex !== -1) {
            messageEmbed.data.fields.splice(executiveHeadIndex, 0, {
              name: departmentName,
              value: `${departmentOfficeChannelId} - <@&${departmentRole}> - To be signed ⌛`,
            });
          } else {
            messageEmbed.data.fields.push({
              name: departmentName,
              value: `${departmentOfficeChannelId} - <@&${departmentRole}> - To be signed ⌛`,
            });
          }
        }
      }
    }

    const messageComponents = interaction.message.components;

    if (messageEmbed.data.description) {
      const submitButtonRow = messageComponents.find((row) =>
        row.components.some(
          (component) => component.customId === "signatoriesSubmit"
        )
      );

      if (submitButtonRow) {
        const submitButtonIndex = submitButtonRow.components.findIndex(
          (component) => component.customId === "signatoriesSubmit"
        );

        if (submitButtonIndex !== -1) {
          submitButtonRow.components[submitButtonIndex].data.disabled = false;
        }
      }
    }

    try {
      await interaction.message.edit({
        embeds: allEmbeds,
        components: messageComponents,
      });
    } catch (error) {
      console.error(error);
    }

    replyEmbed
      .setDescription(`✅ Signatories request has been updated.`)
      .setColor("Grey");

    await interaction.editReply({ embeds: [replyEmbed] });
  },
};
