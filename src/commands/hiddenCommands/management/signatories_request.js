const {
  SlashCommandBuilder,
  ActionRowBuilder,
  MessageFlags,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const managementRoleId = "1314413671245676685";

const management = require("../../../config/management.json");

module.exports = {
  data: new SlashCommandBuilder().setName("signatories_request"),
  pushToArray: false,
  async execute(interaction, client, attachmentFile) {
    await interaction.deferReply({
      flags: MessageFlags.Ephemeral,
    });

    const managementRole = interaction.guild.roles.cache.get(managementRoleId);

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

    const embed = new EmbedBuilder()
      .setTitle("✒️ SIGNATORIES REQUEST")
      .addFields({
        name: "Prepared By",
        value: `<@${interaction.user.id}>\n\u200b`,
      })
      .setColor(managementRole.color)
      .setFooter({
        text: `Please select the departments and/or employees that will sign the request.`,
      });

    const serviceCrewRole = await interaction.guild.roles.cache.get(
      "1314413960274907238"
    );

    const membersWithRoles = await serviceCrewRole.members.map((m) => {
      const name = m.nickname.replace(/^[🔴🟢]\s*/, "") || m.user.username;
      return new StringSelectMenuOptionBuilder()
        .setLabel(name)
        .setValue(m.user.id);
    });

    const userMenu = new StringSelectMenuBuilder()
      .setCustomId("signatoriesEmployeeMenu")
      .setOptions(membersWithRoles)
      .setMinValues(0)
      .setMaxValues(membersWithRoles.length)
      .setPlaceholder("Select target service employee/s.");

    const userMenuRow = new ActionRowBuilder().addComponents(userMenu);

    const departmentMenuOptions = management.map((dept) =>
      new StringSelectMenuOptionBuilder()
        .setLabel(dept.name)
        .setValue(dept.officeChannelId)
    );

    const departmentMenu = new StringSelectMenuBuilder()
      .setCustomId("signatoriesDepartmentMenu")
      .setOptions(departmentMenuOptions)
      .setMinValues(0)
      .setMaxValues(management.length)
      .setPlaceholder("Select target department/s.");

    const departmentMenuRow = new ActionRowBuilder().addComponents(
      departmentMenu
    );

    const submit = new ButtonBuilder()
      .setCustomId("signatoriesSubmit")
      .setLabel("Submit")
      .setDisabled(true)
      .setStyle(ButtonStyle.Success);

    const addAttachment = new ButtonBuilder()
      .setCustomId("signatoriesAddTitle")
      .setLabel("Add Title")
      .setStyle(ButtonStyle.Primary);

    const cancel = new ButtonBuilder()
      .setCustomId("signatoriesCancel")
      .setLabel("Cancel")
      .setStyle(ButtonStyle.Danger);

    const buttonRow = new ActionRowBuilder().addComponents(
      submit,
      addAttachment,
      cancel
    );

    await interaction.channel.send({
      embeds: [embed],
      files: [attachmentFile.url],
      components: [departmentMenuRow, userMenuRow, buttonRow],
    });

    const successEmbed = new EmbedBuilder()
      .setDescription("✅ Signatories request has been created.")
      .setColor("Green");

    await interaction.editReply({ embeds: [successEmbed] });
  },
};
