const { MessageFlags } = require('discord.js');
const {
  buildDiscordThreadUrl,
  sendVerificationPrompt,
} = require('../../../functions/helpers/onboardingUtils');

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

    await sendVerificationPrompt(
      interaction.channel,
      buildDiscordThreadUrl(interaction.guild.id, interaction.channel.id)
    );
  },
};
