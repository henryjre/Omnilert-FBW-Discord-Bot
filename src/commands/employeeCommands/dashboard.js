const {
  SlashCommandBuilder,
  ActionRowBuilder,
  MessageFlags,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType
} = require('discord.js');

const managementRoleId = '1314413671245676685';
const serviceEmployeeRoleId = '1314413960274907238';
const botCommandsChannelId = '1372559141071228998';

const management = require('../../config/management.json');

module.exports = {
  data: new SlashCommandBuilder().setName('dashboard').setDescription('View the dashboard.'),

  async execute(interaction, client) {
    const replyEmbed = new EmbedBuilder();

    // if (interaction.channel.id !== botCommandsChannelId) {
    //   replyEmbed
    //     .setDescription(
    //       `🔴 ERROR: This command can only be used in the <#${botCommandsChannelId}> channel.`
    //     )
    //     .setColor('Red');

    //   await interaction.reply({
    //     embeds: [replyEmbed],
    //     flags: MessageFlags.Ephemeral
    //   });
    //   return;
    // }

    await interaction.deferReply();

    const employeeRole = interaction.guild.roles.cache.find(
      (role) => role.id === serviceEmployeeRoleId
    );

    const dashboardEmbed = new EmbedBuilder()
      .setTitle('📊 Employee Dashboard')
      .setDescription('*Select a button below to view the dashboard.*')
      .setColor(employeeRole.color || 'Blurple')
      .addFields([{ name: 'Employee', value: interaction.member.toString() }]);

    const epiDashboardButton = new ButtonBuilder()
      .setCustomId('viewEpiDashboard')
      .setLabel('EPI')
      .setEmoji('📈')
      .setStyle(ButtonStyle.Success);

    const salaryComputationButton = new ButtonBuilder()
      .setCustomId('salaryComputationDashboard')
      .setLabel('Salary Computation')
      .setEmoji('💵')
      .setStyle(ButtonStyle.Success);

    const buttonRow = new ActionRowBuilder().addComponents(
      epiDashboardButton,
      salaryComputationButton
    );

    await interaction.editReply({
      embeds: [dashboardEmbed],
      components: [buttonRow]
    });
  }
};
