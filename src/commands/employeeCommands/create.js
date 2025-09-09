const {
  SlashCommandBuilder,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  ActionRowBuilder,
} = require("discord.js");

const commandsChannel = "1372559141071228998";

const managementRoleId = "1314413671245676685";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("create")
    .setDescription("Create something...")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("meeting")
        .setDescription("Create a scheduled meeting event.")
        .addStringOption((option) =>
          option
            .setName("type")
            .setDescription("Select the meeting type.")
            .setRequired(true)
            .setChoices([
              {
                name: "General Meeting",
                value: "general",
              },
              {
                name: "Management Meeting",
                value: "management",
              },
              {
                name: "Service Crew Meeting",
                value: "service_crew",
              },
            ])
        )
    ),
  async execute(interaction, client) {
    // if (interaction.channel.id !== commandsChannel) {
    //   return await interaction.reply({
    //     content:
    //       "This command can only be used in the <#1372559141071228998> channel.",
    //     flags: MessageFlags.Ephemeral,
    //   });
    // }

    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case "meeting":
        await runCreateMeetingCommand(interaction, client);
        break;

      default:
        break;
    }
  },
};

async function runCreateMeetingCommand(interaction, client) {
  if (!interaction.member.roles.cache.has(managementRoleId)) {
    const replyEmbed = new EmbedBuilder().setDescription(
      `🔴 ERROR: This command can only be used by <@&${managementRoleId}>.`
    );
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      embeds: [replyEmbed],
    });
    return;
  }

  const type = interaction.options.getString("type");

  let modalId;
  let modalTitle;
  switch (type) {
    case "general":
      modalId = "generalMeetingModal";
      modalTitle = "GENERAL MEETING";
      break;
    case "management":
      modalId = "managementMeetingModal";
      modalTitle = "MANAGEMENT MEETING";
      break;
    case "service_crew":
      modalId = "serviceCrewMeetingModal";
      modalTitle = "SERVICE CREW MEETING";
      break;
  }

  const modal = new ModalBuilder().setCustomId(modalId).setTitle(modalTitle);

  const firstInput = new TextInputBuilder()
    .setCustomId(`meetingAgenda`)
    .setLabel(`Meeting Agenda`)
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder("The agenda for the meeting.")
    .setRequired(true);

  const secondInput = new TextInputBuilder()
    .setCustomId(`startDate`)
    .setLabel(`Meeting Start Date`)
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("E.G: September 8, 2025. (Leave blank for today's date)")
    .setRequired(false);

  const thirdInput = new TextInputBuilder()
    .setCustomId(`startTime`)
    .setLabel(`Meeting Start Time`)
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("E.G: 1:00 PM / 10:35 AM")
    .setRequired(false);

  const firstActionRow = new ActionRowBuilder().addComponents(firstInput);
  const secondActionRow = new ActionRowBuilder().addComponents(secondInput);
  const thirdActionRow = new ActionRowBuilder().addComponents(thirdInput);

  modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);

  await interaction.showModal(modal);
}
