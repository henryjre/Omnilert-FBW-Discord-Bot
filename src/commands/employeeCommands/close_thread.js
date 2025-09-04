const {
  SlashCommandBuilder,
  ActionRowBuilder,
  MessageFlags,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
} = require("discord.js");

const managementRoleId = "1314413671245676685";

const management = require("../../config/management.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("close")
    .setDescription("Close something!")
    .addSubcommand((subcommand) =>
      subcommand.setName("thread").setDescription("Close a thread.")
    ),
  async execute(interaction, client) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case "thread":
        await closeThreadCommand(interaction, client);
        break;

      default:
        break;
    }
  },
};

async function closeThreadCommand(interaction, client) {
  await interaction.deferReply({
    flags: MessageFlags.Ephemeral,
  });

  if (!interaction.member.roles.cache.has(managementRoleId)) {
    const replyEmbed = new EmbedBuilder()
      .setDescription(
        `🔴 ERROR: This command can only be used by <@&${managementRoleId}>.`
      )
      .setColor("Red");
    await interaction.editReply({
      flags: MessageFlags.Ephemeral,
      embeds: [replyEmbed],
    });
    return;
  }

  // Check if the command is being used inside a thread channel
  if (
    interaction.channel.type !== ChannelType.PublicThread &&
    interaction.channel.type !== ChannelType.PrivateThread
  ) {
    const errorEmbed = new EmbedBuilder()
      .setDescription(
        "🔴 ERROR: This command can only be used inside a thread channel."
      )
      .setColor("Red");

    await interaction.editReply({
      embeds: [errorEmbed],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Get the thread's parent channel
  const parentChannel = interaction.channel.parent;

  if (!parentChannel) {
    const errorEmbed = new EmbedBuilder()
      .setDescription(
        "🔴 ERROR: Could not find the parent channel of this thread."
      )
      .setColor("Red");

    await interaction.editReply({
      embeds: [errorEmbed],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Get the category that contains the parent channel
  const category = parentChannel.parent;

  if (!category) {
    const errorEmbed = new EmbedBuilder()
      .setDescription("🔴 ERROR: The parent channel is not in a category.")
      .setColor("Red");

    await interaction.editReply({
      embeds: [errorEmbed],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Check if the thread is in an allowed category
  if (category.name !== "General" && category.name !== "Offices") {
    const errorEmbed = new EmbedBuilder()
      .setDescription(
        `🔴 ERROR: This command can only be used in threads within the "General" or "Offices" categories. Current category: "${category.name}".`
      )
      .setColor("Red");

    await interaction.editReply({
      embeds: [errorEmbed],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  try {
    // Close and lock the thread
    // await interaction.channel.setLocked(true);
    // await new Promise((resolve) => setTimeout(resolve, 1000));
    await interaction.channel.setArchived(true);

    // Create success embed
    const successEmbed = new EmbedBuilder()
      .setDescription("✅ Thread has been successfully closed and locked.")
      .setColor("Green");

    const closedEmbed = new EmbedBuilder()
      .setDescription("## 🔒 This thread has been closed and locked.")
      .addFields([
        {
          name: "Locked By",
          value: `${interaction.user.toString()}`,
        },
      ])
      .setColor("Red")
      .setTimestamp();

    // Create an unlock button for management to reopen the thread if needed
    // const unlockButton = new ButtonBuilder()
    //   .setCustomId("thread_unlock")
    //   .setLabel("Unlock")
    //   .setDisabled(false)
    //   .setStyle(ButtonStyle.Success);

    // // Create an action row to hold the unlock button
    // const actionRow = new ActionRowBuilder().addComponents(unlockButton);

    // Reply with success message
    await interaction.editReply({
      embeds: [successEmbed],
      flags: MessageFlags.Ephemeral,
    });

    await interaction.channel.send({
      embeds: [closedEmbed],
    });
  } catch (error) {
    // Create error embed for any issues during thread closing
    const errorEmbed = new EmbedBuilder()
      .setDescription(`🔴 ERROR: Failed to close thread. ${error.message}`)
      .setColor("Red");

    // Reply with error message
    await interaction.editReply({
      embeds: [errorEmbed],
      flags: MessageFlags.Ephemeral,
    });

    // Log the error for debugging
    console.error("Error closing thread:", error);
  }
}
