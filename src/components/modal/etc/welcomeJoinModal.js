const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");

const serviceCrewRole = "1314413960274907238";
const botRoleId = "1343052940818255986";
const hrChannel = "1342837776017657940";
const hrRole = "1314815153421680640";

module.exports = {
  data: {
    name: "welcomeJoinModal",
  },
  async execute(interaction, client) {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    const nameInput = interaction.fields.getTextInputValue("nameInput");
    const emailInput = interaction.fields.getTextInputValue("emailInput");

    const interactionMember =
      interaction.member?.toString() || interaction.user.toString();
    const memberId = interaction.user.id;
    const botRole = await interaction.guild.roles.cache.get(botRoleId);

    const requestEmbed = new EmbedBuilder()
      .setDescription(`## 👋 NEW MEMBER REQUEST`)
      .addFields([
        {
          name: "Full Name",
          value: `${nameInput}`,
        },
        {
          name: "Email",
          value: `${emailInput}`,
        },
        {
          name: "Discord ID",
          value: `${memberId}`,
        },
        {
          name: "Discord Profile",
          value: `${interactionMember}`,
        },
      ])
      // .setFooter({
      //   iconURL: interaction.user.displayAvatarURL(),
      //   text: `Submitted by: ${interactionMember}`,
      // })
      .setColor(botRole.color);

    await interaction.member.roles.add(serviceCrewRole);

    // await interaction.guild.members.cache
    //   .get(interaction.user.id)
    //   .addRole(serviceCrewRole);

    const replyEmbed = new EmbedBuilder()
      .setDescription(
        `✅ Your request has been sent! You have been given the <@&${serviceCrewRole}> role.`
      )
      .setColor("Green");

    const confirmButton = new ButtonBuilder()
      .setCustomId("acknowledgeWelcome")
      .setLabel("Acknowledge")
      .setStyle(ButtonStyle.Success);

    const buttonRow = new ActionRowBuilder().addComponents(confirmButton);

    const departmentChannel = await client.channels.cache.get(hrChannel);

    await departmentChannel.send({
      content: `<@&${hrRole}>, please send a copy of the employee's 1x1 formal picture for odoo account creation.`,
      embeds: [requestEmbed],
      components: [buttonRow],
    });

    await interaction.editReply({
      embeds: [replyEmbed],
    });
  },
};
