const {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  LabelBuilder,
  MessageFlags,
} = require('discord.js');
const { PORTAL_MESSAGE_LIMIT } = require('../../functions/helpers/portalAnnouncementUtils');

// Invoking /announce is gated on Management; tagging a draft as a portal update
// is gated separately on the technology department in the toggle handler.
const ANNOUNCER_ROLE_ID = '1314413671245676685';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Prepare an announcement.'),

  async execute(interaction, client) {
    return showAnnouncementModal(interaction);
  },
};

async function showAnnouncementModal(interaction) {
  if (!interaction.member.roles.cache.has(ANNOUNCER_ROLE_ID)) {
    const replyEmbed = new EmbedBuilder().setDescription(
      `🔴 ERROR: This command can only be used by <@&${ANNOUNCER_ROLE_ID}>.`
    );
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      embeds: [replyEmbed],
    });
    return;
  }

  if (interaction.channel.isThread()) {
    const replyEmbed = new EmbedBuilder().setDescription(
      `🔴 ERROR: This command cannot be used in a thread channel.`
    );
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      embeds: [replyEmbed],
    });
    return;
  }

  await interaction.showModal(buildAnnouncementModal());
}

function buildAnnouncementModal(value) {
  const modal = new ModalBuilder().setCustomId('portalAnnouncementModal');

  modal.setTitle('Make an announcement');

  const announcementInput = new TextInputBuilder()
    .setCustomId('announcementInput')
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(PORTAL_MESSAGE_LIMIT)
    .setRequired(true);

  if (value) {
    announcementInput.setValue(value);
    announcementInput.setPlaceholder(value);
  }

  const announcementLabel = new LabelBuilder()
    .setLabel('Announcement')
    .setDescription('The details of your announcement')
    .setTextInputComponent(announcementInput);

  modal.addLabelComponents(announcementLabel);

  return modal;
}
