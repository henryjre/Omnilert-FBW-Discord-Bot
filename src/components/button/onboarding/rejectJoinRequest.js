const { ContainerBuilder, MessageFlags } = require('discord.js');

const hrRole = '1314815153421680640';

module.exports = {
  data: {
    name: `rejectJoinRequest`,
  },
  async execute(interaction, client) {
    await interaction.deferUpdate();

    if (!interaction.member.roles.cache.has(hrRole)) {
      return await interaction.followUp({
        content: `You cannot use this button.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const components = interaction.message.components;

    const containerComponent = components[0];
    const textDisplayComponent = containerComponent.components.find(
      (component) => component.type === 10
    );

    const actionRow = containerComponent.components.find((component) => component.type === 1); // Type 1 is ActionRow

    const confirmButton = actionRow.components.find(
      (button) => button.data.custom_id === 'confirmJoinRequest'
    );
    const rejectButton = actionRow.components.find(
      (button) => button.data.custom_id === 'rejectJoinRequest'
    );

    if (confirmButton && rejectButton) {
      confirmButton.data.disabled = true;
      rejectButton.data.disabled = true;
    }

    const componentContent = textDisplayComponent.data.content;

    // Extract User ID
    const userIdMatch = componentContent.match(/User ID:\s*\*?\*?(\d+)\*?\*?/);
    const userId = userIdMatch ? userIdMatch[1] : null;

    if (!userId) {
      return await interaction.followUp({
        content: `🔴 ERROR: User ID not found. Please try again.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const user = await interaction.guild.members.cache.get(userId);

    const rejectContainer = new ContainerBuilder().addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(
        `## Join Request Rejected 🔴\n${user}, ${interaction.user} has rejected your join request.`
      )
    );

    await interaction.channel.send({
      components: [rejectContainer],
      flags: MessageFlags.IsComponentsV2,
    });

    await interaction.message.edit({
      components: components,
      flags: MessageFlags.IsComponentsV2,
    });

    try {
      if (interaction.channel && interaction.channel.manageable) {
        const currentName = interaction.channel.name;
        if (currentName.startsWith('⏳')) {
          const newName = currentName.replace(/^⏳/, '');
          await interaction.channel.setName(newName.trim());
        }
      }
    } catch (error) {
      console.error('Error changing channel name:', error);
    }
  },
};
