const {
  ActionRowBuilder,
  MessageFlags,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const managementRole = "1314413671245676685";
const serviceCrewRole = "1314413960274907238";

module.exports = {
  data: {
    name: `announcementMenu`,
  },
  async execute(interaction, client) {
    let messageEmbed = interaction.message.embeds[0];

    const ownerField = messageEmbed.data.fields.find(
      (f) => f.name === "Prepared By"
    );

    const targetField = messageEmbed.data.fields.find(
      (f) => f.name === "Recipients"
    );

    if (!ownerField.value.includes(interaction.user.id)) {
      const replyEmbed = new EmbedBuilder()
        .setDescription(`🔴 ERROR: You cannot use this menu.`)
        .setColor("Red");

      return await interaction.editReply({
        embeds: [replyEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferUpdate();

    const selected = interaction.values[0];

    if (selected === "@everyone") {
      messageEmbed.data.color = 10070709;

      if (targetField) {
        targetField.value = selected;
      } else {
        messageEmbed.data.fields.push({
          name: "Recipients",
          value: selected,
        });
      }
    } else {
      const role = await interaction.guild.roles.cache.get(selected);

      messageEmbed.data.color = role.color;

      if (targetField) {
        targetField.value = role.toString();
      } else {
        messageEmbed.data.fields.push({
          name: "Recipients",
          value: role.toString(),
        });
      }
    }

    // if announce button is disabled
    let messageComponents = [];
    if (interaction.message.components[1].components[0].data.disabled) {
      const roleMenu = new StringSelectMenuBuilder()
        .setCustomId("announcementMenu")
        .setOptions([
          new StringSelectMenuOptionBuilder()
            .setLabel("Everyone")
            .setValue("@everyone"),
          new StringSelectMenuOptionBuilder()
            .setLabel("Management")
            .setValue(managementRole),
          new StringSelectMenuOptionBuilder()
            .setLabel("Service Crew/Employees")
            .setValue(serviceCrewRole),
        ])
        .setMinValues(1)
        .setMaxValues(1)
        .setPlaceholder("Select target role/s.");

      const submit = new ButtonBuilder()
        .setCustomId("announcementSubmit")
        .setLabel("Announce")
        .setDisabled(false)
        .setStyle(ButtonStyle.Success);

      const cancel = new ButtonBuilder()
        .setCustomId("announcementCancel")
        .setLabel("Cancel")
        .setStyle(ButtonStyle.Danger);

      const menuRow = new ActionRowBuilder().addComponents(roleMenu);
      const buttonRow = new ActionRowBuilder().addComponents(submit, cancel);

      messageComponents.push(menuRow, buttonRow);
    }

    if (messageComponents.length > 0) {
      await interaction.editReply({
        embeds: [messageEmbed],
        components: messageComponents,
      });
    } else {
      await interaction.editReply({
        embeds: [messageEmbed],
      });
    }
  },
};
