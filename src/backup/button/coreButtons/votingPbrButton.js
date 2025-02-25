const {
  ActionRowBuilder,
  StringSelectMenuOptionBuilder,
  StringSelectMenuBuilder,
  EmbedBuilder,
  ButtonStyle,
  ButtonBuilder,
} = require("discord.js");

const criterias = require("./pbrCriteria.json");

module.exports = {
  data: {
    name: `votingPbrButton`,
  },
  async execute(interaction, client) {
    if (!interaction.member.roles.cache.has("1196806310524629062")) {
      await interaction.reply({
        content: `🔴 ERROR: You cannot vote.`,
        ephemeral: true,
      });
      return;
    }
    await interaction.deferReply({ ephemeral: true });

    const interactedUser = interaction.guild.members.cache.get(
      interaction.user.id
    );

    const messageEmbed = interaction.message.embeds[0].data;
    messageEmbed.fields.pop();

    const selectMenuOptions = [];
    for (const c of criterias) {
      const description = c.description;
      const descriptionMatch = description.match(/## (.*?) \(/);
      const criteria = descriptionMatch && descriptionMatch[1];

      const percentageMatch = description.match(/\((\d+)%\)/);
      const percentage = percentageMatch ? parseInt(percentageMatch[1]) : 0;

      messageEmbed.fields.push({
        name: `(${percentage}%) ${criteria}`,
        value: "0",
      });

      selectMenuOptions.push(
        new StringSelectMenuOptionBuilder()
          .setLabel(criteria)
          .setValue(criteria)
      );
    }

    messageEmbed.fields.push({
      name: "Calculated PBR",
      value: "0",
    });

    await sendCriteriaDetails(interactedUser);

    const submit = new ButtonBuilder()
      .setCustomId("pbrSubmit")
      .setLabel("Submit")
      .setDisabled(true)
      .setStyle(ButtonStyle.Success);

    const remarks = new ButtonBuilder()
      .setCustomId("pbrRemarks")
      .setLabel("Add Remarks")
      .setStyle(ButtonStyle.Primary);

    const userMenu = new StringSelectMenuBuilder()
      .setCustomId("pbrMenu")
      .setOptions(selectMenuOptions)
      .setPlaceholder("Select a criteria.");

    const buttonRow = new ActionRowBuilder().addComponents(submit, remarks);
    const menuRow = new ActionRowBuilder().addComponents(userMenu);

    await interactedUser.send({
      embeds: [messageEmbed],
      components: [menuRow, buttonRow],
    });

    await interaction.editReply({
      content:
        "Please check your __**Private Message**__ for the rating of PBR.",
    });

    return;
    // const modal = buildModal();
    // await interaction.showModal(modal);

    // function buildModal() {
    //   const modal = new ModalBuilder()
    //     .setCustomId("votingPbrModal")
    //     .setTitle(`Sumit your PBR vote`);

    //   const firstInput = new TextInputBuilder()
    //     .setCustomId(`pbrInput`)
    //     .setLabel(`Performance Based Rate`)
    //     .setStyle(TextInputStyle.Short)
    //     .setPlaceholder("Rate the performance of the member between 1 to 50.")
    //     .setRequired(true);

    //   const secondInput = new TextInputBuilder()
    //     .setCustomId(`remarksInput`)
    //     .setLabel(`Remarks`)
    //     .setStyle(TextInputStyle.Paragraph)
    //     .setPlaceholder("Add remarks to justify your Upvote and PBR choice.")
    //     .setRequired(true);

    //   const firstActionRow = new ActionRowBuilder().addComponents(firstInput);
    //   const secondActionRow = new ActionRowBuilder().addComponents(secondInput);

    //   modal.addComponents(firstActionRow, secondActionRow);

    //   return modal;
    // }
  },
};

async function sendCriteriaDetails(member) {
  const firstCriteria = new EmbedBuilder(criterias[0]).setFooter({
    text: `Page 1 of ${criterias.length}`,
  });

  const prev = new ButtonBuilder()
    .setCustomId("pbrCriteriaPrevious")
    .setLabel("‹")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(true);

  const next = new ButtonBuilder()
    .setCustomId("pbrCriteriaNext")
    .setLabel("›")
    .setStyle(ButtonStyle.Primary);

  const buttonRow = new ActionRowBuilder().addComponents(prev, next);

  const messagePayload = {
    embeds: [firstCriteria],
    components: [buttonRow],
  };

  await member.send(messagePayload);
}
