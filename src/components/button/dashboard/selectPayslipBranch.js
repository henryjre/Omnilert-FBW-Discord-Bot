const {
  ActionRowBuilder,
  MessageFlags,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ContainerBuilder,
  SeparatorSpacingSize,
  SeparatorBuilder,
} = require('discord.js');

const { getBranches } = require('../../../sqliteFunctions');

module.exports = {
  data: {
    name: `salaryComputationDashboard`,
  },
  async execute(interaction, client) {
    const replyEmbed = new EmbedBuilder();

    const allEmbeds = interaction.message.embeds;
    const messageEmbed = allEmbeds[0];

    const slashInteraction = interaction.message.interaction;
    if (slashInteraction) {
      const slashUser = slashInteraction.user;
      if (!slashUser.id.includes(interaction.user.id)) {
        replyEmbed.setDescription(`🔴 ERROR: You cannot use this button.`).setColor('Red');
        return await interaction.reply({ embeds: [replyEmbed], flags: MessageFlags.Ephemeral });
      }
    }

    const separatorDividerLarge = new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large);
    const separatorDividerSmall = new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small);
    const separatorSpaceSm = new SeparatorBuilder()
      .setDivider(false)
      .setSpacing(SeparatorSpacingSize.Small);

    await interaction.deferUpdate();

    const branches = getBranches();
    const branchOptions = branches.slice(0, 25).map((branch) => ({
      label: branch.name.slice(0, 100),
      value: branch.name.slice(0, 100),
    }));

    const branchMenu = new StringSelectMenuBuilder()
      .setCustomId('payslipBranchMenu')
      .setPlaceholder('Select a branch')
      .setMinValues(1)
      .setMaxValues(1);

    if (branchOptions.length > 0) {
      branchMenu.addOptions(branchOptions);
    } else {
      branchMenu.addOptions({ label: 'No branches available', value: 'none' }).setDisabled(true);
    }

    const backButton = new ButtonBuilder()
      .setCustomId('backToDashboard')
      .setLabel('Back To Dashboard')
      .setEmoji('⬅️')
      .setStyle(ButtonStyle.Secondary);

    const selectBranchContainer = new ContainerBuilder()
      .addTextDisplayComponents((textDisplay) => textDisplay.setContent('# 📊 Employee Dashboard'))
      .addSeparatorComponents(separatorDividerLarge)
      .addTextDisplayComponents((textDisplay) => textDisplay.setContent('## 💵 PAYSLIP DETAILS'))
      .addSeparatorComponents(separatorDividerSmall)
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent('*Select a branch to view the payslip details.*')
      )
      .addActionRowComponents((actionRow) => actionRow.setComponents(branchMenu))
      .addSeparatorComponents(separatorDividerLarge)
      .addActionRowComponents((actionRow) => actionRow.setComponents(backButton));

    await interaction.message.edit({
      components: [selectBranchContainer],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
