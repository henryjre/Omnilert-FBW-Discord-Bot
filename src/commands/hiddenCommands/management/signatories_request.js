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

const management = require("../../../config/management.json");

module.exports = {
  data: new SlashCommandBuilder().setName("signatories_request"),
  pushToArray: false,
  async execute(interaction, client) {
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
      .setURL(`https://omnilert.odoo.com/`)
      .addFields({
        name: "Prepared By",
        value: `<@${interaction.user.id}>\n\u200b`,
      })
      .setColor("#26272F")
      .setFooter({
        text: `Please select the departments and/or employees that will sign the request.`,
      });

    const serviceCrewRole = await interaction.guild.roles.cache.get(
      "1314413960274907238"
    );

    const membersWithServiceCrewRoles = await serviceCrewRole.members.map(
      (m) => {
        const name = m.nickname.replace(/^[🔴🟢]\s*/, "") || m.user.username;
        return new StringSelectMenuOptionBuilder()
          .setLabel(name)
          .setValue(m.user.id);
      }
    );

    const membersWithManagementRoles = await managementRole.members.map((m) => {
      const name = m.nickname.replace(/^[🔴🟢]\s*/, "") || m.user.username;
      return new StringSelectMenuOptionBuilder()
        .setLabel(name)
        .setValue(m.user.id);
    });

    const serviceCrewMenu = new StringSelectMenuBuilder()
      .setCustomId("signatoriesServiceCrewMenu")
      .setOptions(membersWithServiceCrewRoles)
      .setMinValues(0)
      .setMaxValues(membersWithServiceCrewRoles.length)
      .setPlaceholder("Select target service employee/s.");

    const managementMenu = new StringSelectMenuBuilder()
      .setCustomId("signatoriesManagementMenu")
      .setOptions(membersWithManagementRoles)
      .setMinValues(0)
      .setMaxValues(membersWithManagementRoles.length)
      .setPlaceholder("Select target management employee/s.");

    const serviceCrewMenuRow = new ActionRowBuilder().addComponents(
      serviceCrewMenu
    );
    const managementMenuRow = new ActionRowBuilder().addComponents(
      managementMenu
    );

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

    const message = await interaction.channel.send({
      embeds: [embed],
      components: [
        serviceCrewMenuRow,
        managementMenuRow,
        departmentMenuRow,
        buttonRow,
      ],
    });

    const messageThread = await message.startThread({
      name: `Signatories Request - ${message.id}`,
      type: ChannelType.PublicThread, // Set to 'GuildPrivateThread' if only the user should see it
    });

    await messageThread.send({
      content: `📸 ${interaction.user.toString()}, upload the attachment that needs to be signed here. Attachments can either be **1 PDF** or **multiple/single image/s** or both if needed.`,
    });

    const successEmbed = new EmbedBuilder()
      .setDescription("✅ Signatories request has been created.")
      .setColor("Green");

    await interaction.editReply({ embeds: [successEmbed] });
  },
};
