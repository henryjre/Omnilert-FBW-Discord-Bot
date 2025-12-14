const {
  MessageFlags,
  ContainerBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require('discord.js');

module.exports = {
  data: {
    name: `acknowledgeOnboardingButton`,
  },
  async execute(interaction, client) {
    await interaction.deferUpdate();

    const components = interaction.message.components;

    const containerComponent = components[0];
    const actionRow = containerComponent.components.find((component) => component.type === 1); // Type 1 is ActionRow

    const acknowledgeButton = actionRow.components.find(
      (button) => button.data.custom_id === 'acknowledgeOnboardingButton'
    );
    if (acknowledgeButton) {
      acknowledgeButton.data.disabled = true;
    }

    await interaction.message.edit({
      components: components,
      flags: MessageFlags.IsComponentsV2,
    });

    const onboardingContainer = new ContainerBuilder()
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          `# Select employee role.\nPlease select your employee type in the dropdown below.`
        )
      )
      .addSeparatorComponents((separator) => separator)
      .addActionRowComponents((actionRow) =>
        actionRow.setComponents(
          new StringSelectMenuBuilder()
            .setCustomId('onboardingRoleMenu')
            .setPlaceholder('Select here.')
            .setOptions([
              new StringSelectMenuOptionBuilder()
                .setLabel('Management')
                .setDescription('Join the Omnilert management team.')
                .setValue('1314413671245676685'),
              new StringSelectMenuOptionBuilder()
                .setLabel('Service Crew')
                .setDescription('Join as a service crew.')
                .setValue('1314413960274907238'),
              new StringSelectMenuOptionBuilder()
                .setLabel('Others')
                .setDescription('Select this if you are not part of the Omnilert organization.')
                .setValue('1449677551365521419'), //Temporary role
            ])
        )
      );

    await interaction.channel.send({
      components: [onboardingContainer],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
