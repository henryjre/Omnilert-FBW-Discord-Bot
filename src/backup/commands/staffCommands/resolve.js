const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("resolve")
    .setDescription("Add a resolution to a concluded Leviosa Proposal.")
    .addAttachmentOption((option) =>
      option
        .setName("resolution")
        .setDescription("The PDF file of the resolution.")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("proposal-number")
        .setDescription("E.G. 2024-00001.")
        .setRequired(true)
    ),

  async execute(interaction, client) {
    const resolutionFile = interaction.options.getAttachment("resolution");
    const proposalNumber = interaction.options.getString("proposal-number");

    if (resolutionFile.contentType !== "application/pdf") {
      interaction.reply({
        content: `🔴 ERROR: The proposal attachment should be a PDF file.`,
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply();

    const proposalName = `📌 LEVIOSA PROPOSAL | ${proposalNumber}`;

    const proposalThread = client.channels.cache.find(
      (channel) => channel.isThread() && channel.name === proposalName
    );

    if (!proposalThread) {
      await interaction.editReply({
        content: `🔴 ERROR: Cannot find the Leviosa Proposal with the provided proposal number: **\`${proposalNumber}\`**.`,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setDescription(
        `## Resolution Submitted\nPlease check the <#${proposalThread.id}> to check your proposal.`
      )
      .setColor("Green");

    await proposalThread.send({
      files: [
        {
          attachment: resolutionFile.url,
          name: `Proposal_Resolution_${proposalNumber}.pdf`,
        },
      ],
    });

    await interaction.editReply({
      embeds: [embed],
    });
  },
};
