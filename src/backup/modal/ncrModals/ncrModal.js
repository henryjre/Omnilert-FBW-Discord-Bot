const {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  StringSelectMenuOptionBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");
// const conn = require("../../../sqlConnection.js");
// const pools = require("../../../sqlPools.js");

module.exports = {
  data: {
    name: "ncrModal",
  },
  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });
    const messagePayload = {};
    try {
      const title = interaction.fields.getTextInputValue("titleInput");
      const details = interaction.fields.getTextInputValue("detailsInput");
      const impact = interaction.fields.getTextInputValue("impactInput");
      const correctiveAction =
        interaction.fields.getTextInputValue("correctiveAction");
      const preventiveAction =
        interaction.fields.getTextInputValue("preventiveAction");

      const channel = interaction.channel;

      // const mgmt_connection = await conn.managementConnection();
      const mgmt_connection = await pools.managementPool.getConnection();
      try {
        const queryDepartments = "SELECT * FROM Executives;";
        const [departments] = await mgmt_connection.query(queryDepartments);

        const department = departments.find(
          (d) => d.NCR_OFFICE_ID === channel.id
        );

        if (!department) {
          throw new Error(
            "Cannot find the department of this channel. Please use the command on channels under NON-CONFORMANCE REPORT"
          );
        }

        const executive = interaction.guild.members.cache.get(
          department.MEMBER_ID
        );
        const role = await interaction.guild.roles.cache.get(
          department.ROLE_ID
        );

        const interactionMember = await interaction.guild.members.cache.get(
          interaction.user.id
        );

        const ncrEmbed = new EmbedBuilder()
          .setDescription(
            `# 🚨 NON-CONFORMANCE REPORT\n## *${title}*\n**Reported By:** ${interactionMember.nickname}`
          )
          .addFields([
            {
              name: "Deficiency Details",
              value: details,
            },
            {
              name: "Impact",
              value: impact,
            },
            {
              name: "Corrective Action",
              value: correctiveAction,
            },
            {
              name: "Preventive Action",
              value: preventiveAction,
            },
          ])
          .setFooter({
            text: `This Non-Conformance Report will be rated by the Executive Department Head depending on the severity.`,
          })
          .setColor(role.color);

        const rateButton = new ButtonBuilder()
          .setCustomId("ncrRate")
          .setLabel("Rate")
          .setStyle(ButtonStyle.Success);

        const buttonRow = new ActionRowBuilder().addComponents(rateButton);

        messagePayload.content = executive.toString();
        messagePayload.embeds = [ncrEmbed];
        messagePayload.components = [buttonRow];

        await channel.send(messagePayload);
        await interaction.editReply({ content: "NCR reported successfully!" });
      } finally {
        // await mgmt_connection.end();
        mgmt_connection.release();
      }
    } catch (error) {
      console.log(error.stack);
      messagePayload.content = `🔴 ERROR: ${error.message}`;
      await interaction.editReply(messagePayload);
    }
  },
};
