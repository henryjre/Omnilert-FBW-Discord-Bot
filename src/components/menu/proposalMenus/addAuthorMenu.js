module.exports = {
  data: {
    name: `proposalAuthorMenu`,
  },
  async execute(interaction, client) {
    if (interaction.message.interaction.user.id !== interaction.user.id) {
      await interaction.reply({
        content: `You cannot use this button.`,
        ephemeral: true,
      });
      return;
    }

    await interaction.deferUpdate();

    const messageEmbed = interaction.message.embeds[0].data;
    const authorFieldsIndex = messageEmbed.fields.findIndex((f) =>
      ["Author", "Authors"].includes(f.name)
    );

    const selectedMember = interaction.values[0];

    if (authorFieldsIndex === -1) {
      const acknowledgementEmbed = {
        name: "Author",
        value: `<@${selectedMember}>`,
      };

      messageEmbed.fields.push(acknowledgementEmbed);
    } else {
      messageEmbed.fields[authorFieldsIndex].name = "Authors";
      messageEmbed.fields[authorFieldsIndex].value += `\n<@${selectedMember}>`;
    }

    await interaction.editReply({ embeds: [messageEmbed] });
  },
};
