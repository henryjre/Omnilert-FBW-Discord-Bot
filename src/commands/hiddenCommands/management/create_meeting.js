const {
  SlashCommandBuilder,
  MessageFlags,
  EmbedBuilder,
  GuildScheduledEventManager,
} = require('discord.js');

const managementRoleId = '1314413671245676685';

module.exports = {
  data: new SlashCommandBuilder().setName('create_meeting'),
  pushToArray: false,
  async execute(interaction, client) {
    await interaction.deferReply({
      flags: MessageFlags.Ephemeral,
    });

    if (!interaction.member.roles.cache.has(managementRoleId)) {
      const replyEmbed = new EmbedBuilder().setDescription(
        `🔴 ERROR: This command can only be used by <@&${managementRoleId}>.`
      );
      await interaction.editReply({
        flags: MessageFlags.Ephemeral,
        embeds: [replyEmbed],
      });
      return;
    }

    const event = new GuildScheduledEventManager({
      name: 'Meeting',
      description: 'A meeting with the management.',
      startAt: new Date(),
      endAt: new Date(),
      channel: interaction.channel,
    });
  },
};
