const { MessageFlags } = require("discord.js");

module.exports = {
  data: {
    name: `auditRatingMenu`,
  },
  async execute(interaction, client) {
    const mentionedUser = interaction.message.mentions?.users?.first() || null;
    const mentionedRole = interaction.message.mentions?.roles?.first() || null;

    if (mentionedUser) {
      const isNotMentionedUser = interaction.user.id !== mentionedUser.id;
      if (isNotMentionedUser) {
        return await interaction.reply({
          content: `🔴 ERROR: You cannot use this button.`,
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    if (mentionedRole) {
      const doesNotHaveRole = !interaction.member.roles.cache.has(
        mentionedRole.id
      );
      if (doesNotHaveRole) {
        return await interaction.reply({
          content: `🔴 ERROR: You cannot use this button.`,
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    await interaction.deferUpdate();

    let allEmbeds = interaction.message.embeds;
    const messageEmbed = allEmbeds[0];

    const rating = interaction.values[0];
    const color = getColor(rating);

    try {
      const auditor =
        interaction.member.nickname.replace(/^[🔴🟢]\s*/, "") ||
        interaction.user.username;

      const auditedByField = messageEmbed.data.fields.find(
        (field) => field.name === "Audited By"
      );
      const auditRatingField = messageEmbed.data.fields.find(
        (field) => field.name === "Audit Rating"
      );

      if (auditedByField && auditRatingField) {
        auditedByField.value = auditor;
        auditRatingField.value = rating;
      } else {
        messageEmbed.data.fields.push(
          {
            name: "\u200b",
            value: "\u200b",
          },
          {
            name: `Audited By`,
            value: interaction.user.toString(),
          },
          {
            name: `Audit Rating`,
            value: rating,
          }
        );
      }

      messageEmbed.data.color = color;

      const messageComponents = interaction.message.components;

      const buttonRow = messageComponents.find((row) =>
        row.components.some((component) => component.customId === "auditFinish")
      );

      if (buttonRow) {
        const confirmButtonIndex = buttonRow.components.findIndex(
          (component) => component.customId === "auditFinish"
        );

        if (confirmButtonIndex !== -1) {
          buttonRow.components[confirmButtonIndex].data.disabled = false;
        }
      }

      await interaction.message.edit({
        embeds: allEmbeds,
        components: messageComponents,
      });
    } catch (error) {
      console.log(error);
      await interaction.followUp({
        content: `🔴 ERROR: An error occurred while rating the audit. Please try again.`,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

function getColor(rating) {
  switch (rating) {
    case "⭐":
      return 0x145214; // dark forest green
    case "⭐⭐":
      return 0x1f7a1f; // deep green
    case "⭐⭐⭐":
      return 0x28a428; // medium green
    case "⭐⭐⭐⭐":
      return 0x33cc33; // bright green
    case "⭐⭐⭐⭐⭐":
      return 0x57f287; // Discord green / success color
    default:
      return 0x57f287; // fallback to bright green
  }
}
