const { EmbedBuilder } = require("discord.js");

module.exports = {
  data: {
    name: "coreComplaint",
  },
  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    const complaint = interaction.fields.getTextInputValue("complainInput");
    const userId = interaction.fields.getTextInputValue("userId");

    const member = interaction.guild.members.cache.get(userId);
    if (!member) {
      await interaction.editReply({
        content: `🔴 ERROR: No member found. Please try the command again and **do not change** the USER ID input.`,
        ephemeral: true,
      });
      return;
    } else if (!member.roles.cache.has("1185935514042388520")) {
      await interaction.editReply({
        content: `🔴 ERROR: ${member.nickname} is not a <@&1185935514042388520> member.`,
        ephemeral: true,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setDescription(
        `## Complaint Submitted\nPlease check the <#1186661983362224138> channel to check your suggestion.`
      )
      .setColor("Green");

    const proposalEmbed = new EmbedBuilder()
      .setTitle(`💢 COMPLAINT FILED`)
      .addFields([
        {
          name: "Core Member",
          value: member.nickname,
        },
        {
          name: "Details",
          value: complaint,
        },
      ])
      .setTimestamp(Date.now())
      .setColor("#F8312F");

    await interaction.editReply({
      embeds: [embed],
      ephemeral: true,
    });

    await client.channels.cache.get("1186661983362224138").send({
      content: member.toString(),
      embeds: [proposalEmbed],
    });
  },
};
