const {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  LabelBuilder,
  MessageFlags,
} = require('discord.js');
const {
  PORTAL_ANNOUNCER_ROLE_ID,
  PORTAL_MESSAGE_LIMIT,
} = require('../../functions/helpers/portalAnnouncementUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Prepare an announcement.')
    .addSubcommand((subcommand) =>
      subcommand.setName('standard').setDescription('Prepare a standard announcement.')
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('portal').setDescription('Prepare a portal announcement.')
    ),

  async execute(interaction, client) {
    const subcommand = interaction.options.getSubcommand(false) || 'standard';

    if (subcommand === 'portal') {
      return showPortalModal(interaction);
    }

    return showStandardModal(interaction);
  },
};

async function showStandardModal(interaction) {
  const validRoles = ['1314413671245676685'];

  if (!interaction.member.roles.cache.some((r) => validRoles.includes(r.id))) {
    const replyEmbed = new EmbedBuilder().setDescription(
      `🔴 ERROR: This command can only be used by <@&1314413671245676685>.`
    );
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      embeds: [replyEmbed],
    });
    return;
  }

  // Check if the command was invoked in a thread
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

  const modal = buildStandardModal();
  await interaction.showModal(modal);
}

async function showPortalModal(interaction) {
  if (!interaction.member.roles.cache.has(PORTAL_ANNOUNCER_ROLE_ID)) {
    const replyEmbed = new EmbedBuilder().setDescription(
      `🔴 ERROR: This command can only be used by <@&${PORTAL_ANNOUNCER_ROLE_ID}>.`
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

  await interaction.showModal(buildPortalModal());
}

function buildStandardModal() {
  const modal = new ModalBuilder().setCustomId('announcementModal');

  modal.setTitle(`Make an announcement`);

  const firstInput = new TextInputBuilder()
    .setCustomId(`titleInput`)
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const firstLabel = new LabelBuilder()
    .setLabel('Title')
    .setDescription('The title of your announcement')
    .setTextInputComponent(firstInput);

  const secondInput = new TextInputBuilder()
    .setCustomId(`announcementInput`)
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(4000)
    .setRequired(true);

  const secondLabel = new LabelBuilder()
    .setLabel('Announcement Details')
    .setDescription('The details of your announcement')
    .setTextInputComponent(secondInput);

  modal.addLabelComponents(firstLabel, secondLabel);

  return modal;
}

function buildPortalModal(value) {
  const modal = new ModalBuilder().setCustomId('portalAnnouncementModal');

  modal.setTitle('Make a portal announcement');

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
    .setDescription('The announcement to send in the portal announcement channel')
    .setTextInputComponent(announcementInput);

  modal.addLabelComponents(announcementLabel);

  return modal;
}

module.exports.buildPortalModal = buildPortalModal;
