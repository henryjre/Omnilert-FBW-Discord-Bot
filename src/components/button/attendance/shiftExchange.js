const {
  ActionRowBuilder,
  MessageFlags,
  EmbedBuilder,
  StringSelectMenuOptionBuilder,
  StringSelectMenuBuilder
} = require('discord.js');

module.exports = {
  data: {
    name: `shiftExchangeButton`
  },
  async execute(interaction, client) {
    // const mentionedUser = interaction.message.mentions?.users?.first() || null;
    // const mentionedRole = interaction.message.mentions?.roles?.first() || null;

    // if (mentionedUser) {
    //   const isNotMentionedUser = interaction.user.id !== mentionedUser.id;
    //   if (isNotMentionedUser) {
    //     return await interaction.reply({
    //       content: `🔴 ERROR: You cannot use this button.`,
    //       flags: MessageFlags.Ephemeral
    //     });
    //   }
    // }

    // if (mentionedRole) {
    //   const doesNotHaveRole = !interaction.member.roles.cache.has(mentionedRole.id);
    //   if (doesNotHaveRole) {
    //     return await interaction.reply({
    //       content: `🔴 ERROR: You cannot use this button.`,
    //       flags: MessageFlags.Ephemeral
    //     });
    //   }
    // }

    const allowedUsers = ['748568303219245117', '844881805688963072'];

    if (allowedUsers.includes(interaction.user.id)) {
      return await interaction.reply({
        content: `🔴 ERROR: You cannot use this button.`,
        flags: MessageFlags.Ephemeral
      });
    }

    const allEmbeds = interaction.message.embeds;
    const messageEmbed = allEmbeds[0];

    const shiftIdField = messageEmbed.data.fields.find((field) => field.name === 'ID');
    const assignedNameField = messageEmbed.data.fields.find(
      (field) => field.name === 'Discord User'
    );
    const branchField = messageEmbed.data.fields.find((field) => field.name === 'Branch');
    const dutyTypeField = messageEmbed.data.fields.find((field) => field.name === 'Duty Type');
    const shiftStartField = messageEmbed.data.fields.find((field) => field.name === 'Shift Start');
    const shiftEndField = messageEmbed.data.fields.find((field) => field.name === 'Shift End');

    const shiftExchangeEmbed = new EmbedBuilder()
      .setDescription('## 🔄 SHIFT EXCHANGE REQUEST')
      .addFields([
        { name: 'Shift ID', value: shiftIdField.value },
        { name: 'Branch', value: branchField.value },
        { name: 'Duty Type', value: dutyTypeField.value },
        { name: 'Shift Start', value: shiftStartField.value },
        { name: 'Shift End', value: shiftEndField.value },
        { name: 'Assigned Name', value: assignedNameField.value }
      ]);

    const serviceCrewRole = await interaction.guild.roles.cache.get('1314413960274907238');
    const membersWithServiceCrewRoles = await serviceCrewRole.members.map((m) => {
      const name = m.nickname.replace(/^[🔴🟢]\s*/, '') || m.user.username;
      return new StringSelectMenuOptionBuilder().setLabel(name).setValue(m.user.id);
    });

    const relieverMenu = new StringSelectMenuBuilder()
      .setCustomId('relieverMenu')
      .setPlaceholder('Select a reliever')
      .addOptions(membersWithServiceCrewRoles);

    const relieverMenuRow = new ActionRowBuilder().addComponents(relieverMenu);

    const thread = interaction.message.thread;

    await thread.send({
      content: `${interaction.user.toString()}, select a reliever from the menu below.`,
      embeds: [shiftExchangeEmbed],
      components: [relieverMenuRow]
    });
  }
};
