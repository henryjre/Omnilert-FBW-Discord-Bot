const {
  SlashCommandBuilder,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  LabelBuilder,
} = require('discord.js');

const managementRoleId = '1314413671245676685';
const commandAdministratorRoleId = '1523620813599936623';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('create')
    .setDescription('Create something...')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('meeting')
        .setDescription('Create a scheduled meeting event.')
        .addStringOption((option) =>
          option
            .setName('type')
            .setDescription('Select the meeting type.')
            .setRequired(true)
            .setChoices([
              {
                name: 'General Meeting',
                value: 'general',
              },
              {
                name: 'Management Meeting',
                value: 'management',
              },
              {
                name: 'Service Crew Meeting',
                value: 'service_crew',
              },
            ])
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('department')
        .setDescription('Create a department.')
        .addStringOption((option) =>
          option
            .setName('role_id')
            .setDescription('Optional existing Discord role ID.')
            .setRequired(false)
        )
        .addStringOption((option) =>
          option
            .setName('channel_id')
            .setDescription('Optional existing Discord channel ID.')
            .setRequired(false)
        )
    ),
  async execute(interaction, client) {
    // if (interaction.channel.id !== commandsChannel) {
    //   return await interaction.reply({
    //     content:
    //       "This command can only be used in the <#1372559141071228998> channel.",
    //     flags: MessageFlags.Ephemeral,
    //   });
    // }

    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'meeting':
        await runCreateMeetingCommand(interaction, client);
        break;
      case 'department':
        await runCreateDepartmentCommand(interaction, client);
        break;

      default:
        break;
    }
  },
};

async function runCreateMeetingCommand(interaction, client) {
  if (!interaction.member.roles.cache.has(managementRoleId)) {
    const replyEmbed = new EmbedBuilder().setDescription(
      `🔴 ERROR: This command can only be used by <@&${managementRoleId}>.`
    );
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      embeds: [replyEmbed],
    });
    return;
  }

  const type = interaction.options.getString('type');

  let modalId;
  let modalTitle;
  switch (type) {
    case 'general':
      modalId = 'generalMeetingModal';
      modalTitle = 'GENERAL MEETING';
      break;
    case 'management':
      modalId = 'managementMeetingModal';
      modalTitle = 'MANAGEMENT MEETING';
      break;
    case 'service_crew':
      modalId = 'serviceCrewMeetingModal';
      modalTitle = 'SERVICE CREW MEETING';
      break;
  }

  const modal = new ModalBuilder().setCustomId(modalId).setTitle(modalTitle);

  const firstInput = new TextInputBuilder()
    .setCustomId(`meetingAgenda`)
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);

  const firstLabel = new LabelBuilder()
    .setLabel('Meeting Agenda')
    .setDescription('The agenda for the meeting.')
    .setTextInputComponent(firstInput);

  const secondInput = new TextInputBuilder()
    .setCustomId(`startDate`)
    .setStyle(TextInputStyle.Short)
    .setRequired(false);

  const secondLabel = new LabelBuilder()
    .setLabel('Meeting Start Date')
    .setDescription("Example: September 8, 2025. (Leave blank for today's date)")
    .setTextInputComponent(secondInput);

  const thirdInput = new TextInputBuilder()
    .setCustomId(`startTime`)
    .setStyle(TextInputStyle.Short)
    .setRequired(false);

  const thirdLabel = new LabelBuilder()
    .setLabel('Meeting Start Time')
    .setDescription('Example: 1:00 PM / 10:35 AM')
    .setTextInputComponent(thirdInput);

  modal.addLabelComponents(firstLabel, secondLabel, thirdLabel);

  await interaction.showModal(modal);
}

async function runCreateDepartmentCommand(interaction, client) {
  if (!interaction.member.roles.cache.has(commandAdministratorRoleId)) {
    const replyEmbed = new EmbedBuilder().setDescription(
      `🔴 ERROR: This command can only be used by <@&${commandAdministratorRoleId}>.`
    );
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      embeds: [replyEmbed],
    });
    return;
  }

  const roleId = interaction.options.getString('role_id')?.trim() || 'none';
  const channelId = interaction.options.getString('channel_id')?.trim() || 'none';

  const modal = new ModalBuilder()
    .setCustomId(`createDepartmentModal:${roleId}:${channelId}`)
    .setTitle('CREATE DEPARTMENT');

  const departmentNameInput = new TextInputBuilder()
    .setCustomId('departmentName')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const departmentNameLabel = new LabelBuilder()
    .setLabel('Department Name')
    .setDescription('The display name for this department.')
    .setTextInputComponent(departmentNameInput);

  const emojiIconInput = new TextInputBuilder()
    .setCustomId('emojiIcon')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const emojiIconLabel = new LabelBuilder()
    .setLabel('Emoji Icon')
    .setDescription('Used in the channel name, e.g. 🏢.')
    .setTextInputComponent(emojiIconInput);

  modal.addLabelComponents(departmentNameLabel, emojiIconLabel);

  await interaction.showModal(modal);
}
