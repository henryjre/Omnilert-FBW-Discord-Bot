const {
  EmbedBuilder,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  LabelBuilder,
} = require('discord.js');

module.exports = {
  data: {
    name: `announcementEdit`,
  },
  async execute(interaction, client) {
    const messageEmbed = interaction.message.embeds[0];

    const ownerField = messageEmbed.data.fields.find((f) => f.name === 'Prepared By');

    if (!ownerField.value.includes(interaction.user.id)) {
      const replyEmbed = new EmbedBuilder()
        .setDescription(`🔴 ERROR: You cannot use this button.`)
        .setColor('Red');

      return await interaction.reply({
        flags: MessageFlags.Ephemeral,
        embeds: [replyEmbed],
      });
    }

    const raw = messageEmbed.data.description ?? '';

    // 1) Remove zero-width characters: ZWSP, ZWNJ, ZWJ, and BOM
    const description = raw.replace(/[\u200B-\u200D\uFEFF]/g, '');

    // 2) Split lines and extract title
    const lines = description.split('\n');
    const titleIdx = lines.findIndex((l) => l.startsWith('## *'));
    const title = titleIdx !== -1 ? lines[titleIdx].replace(/^## \*|\*$/g, '').trim() : null;

    // 3) Gather details (everything after the title)
    let detailsLines = lines.slice(titleIdx + 1);

    // 4) Remove only leading/trailing blank lines
    while (detailsLines.length && detailsLines[0].trim() === '') detailsLines.shift();
    while (detailsLines.length && detailsLines[detailsLines.length - 1].trim() === '')
      detailsLines.pop();

    let details = detailsLines.join('\n');

    const modal = new ModalBuilder().setCustomId('announcementEditModal');

    modal.setTitle(`Edit the announcement`);

    const firstInput = new TextInputBuilder()
      .setCustomId(`titleInput`)
      .setStyle(TextInputStyle.Short)
      .setValue(title)
      .setRequired(true);

    const firstLabel = new LabelBuilder()
      .setLabel('Title')
      .setDescription('The title of your announcement')
      .setTextInputComponent(firstInput);

    const secondInput = new TextInputBuilder()
      .setCustomId(`announcementInput`)
      .setStyle(TextInputStyle.Paragraph)
      .setValue(details)
      .setMaxLength(4000)
      .setRequired(true);

    const secondLabel = new LabelBuilder()
      .setLabel('Announcement Details')
      .setDescription('The details of your announcement')
      .setTextInputComponent(secondInput);

    modal.addLabelComponents(firstLabel, secondLabel);

    await interaction.showModal(modal);
  },
};
