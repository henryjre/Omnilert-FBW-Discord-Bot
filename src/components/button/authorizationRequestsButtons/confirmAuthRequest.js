const {
  ActionRowBuilder,
  MessageFlags,
  EmbedBuilder,
  ButtonStyle,
  ButtonBuilder,
} = require("discord.js");

const hrDepartmentChannel = "1372557527715156049";
const hrRole = "1314815153421680640";

const financeDepartmentChannel = "1372557255966330981";
const financeRole = "1314815202679590984";

module.exports = {
  data: {
    name: `confirmAuthRequest`,
  },
  async execute(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    let messageEmbed = interaction.message.embeds[0];
    let attachments = [];

    if (interaction.message.attachments.size > 0) {
      attachments = Array.from(interaction.message.attachments.values());
    }

    const ownerFieldNames = [
      "Assigned Name",
      "Employee Name",
      "Notification By",
      "Reported By",
      "Requested By",
      "Submitted By",
    ];

    const ownerField = messageEmbed.data.fields.find((f) =>
      ownerFieldNames.includes(f.name)
    );

    const replyEmbed = new EmbedBuilder();

    if (!ownerField.value.includes(interaction.user.id)) {
      replyEmbed
        .setDescription(`🔴 ERROR: You cannot use this button.`)
        .setColor("Red");

      return await interaction.editReply({
        embeds: [replyEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }

    let department, role, deptName;

    if (interaction.message.interaction.commandName === "request cash") {
      department = financeDepartmentChannel;
      role = financeRole;
      deptName = "Finance Department";
    } else if (
      interaction.message.interaction.commandName === "request authorization"
    ) {
      department = hrDepartmentChannel;
      role = hrRole;
      deptName = "HR Department";
    }

    const departmentChannel = await client.channels.cache.get(department);

    const confirmButton = new ButtonBuilder()
      .setCustomId("approveAuthorization")
      .setLabel("Approve")
      .setStyle(ButtonStyle.Success);

    const rejectButton = new ButtonBuilder()
      .setCustomId("rejectAuthorization")
      .setLabel("Reject")
      .setStyle(ButtonStyle.Danger);

    const buttonRow = new ActionRowBuilder().addComponents(
      confirmButton,
      rejectButton
    );

    const confirmInterim = new ButtonBuilder()
      .setCustomId("approveInterimDuty")
      .setLabel("Confirm")
      .setStyle(ButtonStyle.Success);

    const rejectInterim = new ButtonBuilder()
      .setCustomId("rejectInterimDuty")
      .setLabel("Reject")
      .setStyle(ButtonStyle.Danger);

    const interimButtonRow = new ActionRowBuilder().addComponents(
      confirmInterim,
      rejectInterim
    );

    const messagePayload = {
      content: `<@&${role}>`,
      embeds: [messageEmbed],
      components: [buttonRow],
    };

    if (messageEmbed.data.description.includes("INTERIM DUTY FORM TEST")) {
      messagePayload.content = ``;
      messagePayload.components = [interimButtonRow];
    }

    if (attachments.length > 0) {
      messagePayload.files = attachments;
    }

    await departmentChannel.send(messagePayload);

    await interaction.message.delete();

    replyEmbed
      .setDescription(
        `You have confirmed the request. Please wait for the approval of the ${deptName}.`
      )
      .setColor("Green");

    await interaction.editReply({ embeds: [replyEmbed] });
  },
};
