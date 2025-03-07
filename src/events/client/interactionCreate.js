const {
  InteractionType,
  Collection,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");
module.exports = {
  name: "interactionCreate",
  async execute(interaction, client) {
    if (interaction.isChatInputCommand()) {
      const { commands, cooldowns } = client;
      const { commandName } = interaction;
      const command = commands.get(commandName);
      if (!command) return;

      if (!cooldowns.has(command.data.name)) {
        cooldowns.set(command.data.name, new Collection());
      }

      const now = Date.now();
      const timestamps = cooldowns.get(command.data.name);
      const defaultCooldownDuration = 3;
      const cooldownAmount =
        (command.cooldown ?? defaultCooldownDuration) * 1000;

      if (timestamps.has(interaction.user.id)) {
        const expirationTime =
          timestamps.get(interaction.user.id) + cooldownAmount;

        if (now < expirationTime) {
          const expiredTimestamp = Math.round(expirationTime / 1000);
          const cooldownEmbed = new EmbedBuilder()
            .setTitle(`PLEASE WAIT`)
            .setColor("Blurple")
            .setDescription(
              `You are on a cooldown for \`${command.data.name}\` command. You can use it again <t:${expiredTimestamp}:R>`
            );

          await interaction
            .reply({
              embeds: [cooldownEmbed],
              flags: MessageFlags.Ephemeral,
            })
            .then(() => {
              setTimeout(() => {
                interaction.deleteReply();
              }, 60000);
            });

          return;
        }
      }

      timestamps.set(interaction.user.id, now);
      setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

      try {
        await command.execute(interaction, client);
      } catch (error) {
        console.error(error);
        await interaction.reply({
          content: `Something went wrong while executing this command...`,
          flags: MessageFlags.Ephemeral,
        });
      }
    } else if (interaction.isButton()) {
      const { buttons } = client;
      const { customId } = interaction;
      const button = buttons.get(customId);
      if (!button) return new Error("No code for this button.");

      try {
        await button.execute(interaction, client);
      } catch (error) {
        console.error(error);
      }
    } else if (interaction.isStringSelectMenu()) {
      const { selectMenus } = client;
      const { customId } = interaction;
      const menu = selectMenus.get(customId);
      if (!menu) return new Error("No code for this select menu.");

      try {
        await menu.execute(interaction, client);
      } catch (error) {
        console.error(error);
      }
    } else if (interaction.type == InteractionType.ModalSubmit) {
      const { modals } = client;
      const { customId } = interaction;
      const modal = modals.get(customId);
      if (!modal) return new Error("No code for this modal.");

      try {
        await modal.execute(interaction, client);
      } catch (error) {
        console.error(error);
      }
    }
  },
};
