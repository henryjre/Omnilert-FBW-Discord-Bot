const { ContainerBuilder, MessageFlags } = require('discord.js');

const hrRole = '1314815153421680640';

const techRole = '1314815091908022373';

const onboardingRole = '1451964458791604244';

module.exports = {
  data: {
    name: `confirmJoinRequest`,
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

    // Extract Role ID
    const roleIdMatch = componentContent.match(/Role ID:\s*\*?\*?(\d+)\*?\*?/);
    const roleId = roleIdMatch ? roleIdMatch[1] : null;

    // Extract User ID
    const userIdMatch = componentContent.match(/User ID:\s*\*?\*?(\d+)\*?\*?/);
    const userId = userIdMatch ? userIdMatch[1] : null;

    if (!roleId || !userId) {
      return await interaction.followUp({
        content: `🔴 ERROR: Role ID or User ID not found. Please try again.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const role = await interaction.guild.roles.cache.get(roleId);
    const user = await interaction.guild.members.cache.get(userId);

    try {
      await user.roles.add(role);
    } catch (error) {
      console.error('Error adding role to user:', error);
      return await interaction.followUp({
        content: `🔴 ERROR: An error occurred while adding the role to the user. Please try again.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const confirmContainer = new ContainerBuilder()
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          `## Join Request Confirmed 🎉\n${user}, ${interaction.user} has approved your join request.`
        )
      )
      .addSeparatorComponents((separator) => separator)
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          `An Odoo account will be created for you shortly by the <@&${techRole}>. Feel free to browse the server for now.`
        )
      );

    await interaction.channel.send({
      components: [confirmContainer],
      flags: MessageFlags.IsComponentsV2,
    });

    await interaction.message.edit({
      components: components,
      flags: MessageFlags.IsComponentsV2,
    });

    try {
      await interaction.member.roles.remove(onboardingRole);
    } catch (error) {
      console.error('Error removing onboarding role:', error);
    }
  },
};
