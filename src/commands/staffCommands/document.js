const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

const { customAlphabet } = require("nanoid");
const nanoid = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZ", 6);

module.exports = {
  data: new SlashCommandBuilder()
    .setName("doc")
    .setDescription(
      "Start a voting session for the voting rights of a core member."
    )
    .addAttachmentOption((option) =>
      option
        .setName("document")
        .setDescription("The document to be signed")
        .setRequired(true)
    )
    .addUserOption((option) =>
      option
        .setName("signing-user-1")
        .setDescription("The first user to sign.")
        .setRequired(false)
    )
    .addUserOption((option) =>
      option
        .setName("signing-user-2")
        .setDescription("The second user to sign.")
        .setRequired(false)
    )
    .addUserOption((option) =>
      option
        .setName("signing-user-3")
        .setDescription("The third user to sign.")
        .setRequired(false)
    )
    .addUserOption((option) =>
      option
        .setName("signing-user-4")
        .setDescription("The fourth user to sign.")
        .setRequired(false)
    )
    .addUserOption((option) =>
      option
        .setName("signing-user-5")
        .setDescription("The fifth user to sign.")
        .setRequired(false)
    ),

  async execute(interaction, client) {
    const validRoles = ["1185935514042388520"];

    if (
      !interaction.member.roles.cache.some((r) => validRoles.includes(r.id))
    ) {
      await interaction.reply({
        content: `🔴 ERROR: This command can only be used by <@&1185935514042388520>.`,
        ephemeral: true,
      });
      return;
    }

    if (
      interaction.options._hoistedOptions.filter((i) => i.type === 6).length <=
      0
    ) {
      await interaction.reply({
        content: `🔴 ERROR: No user/s to sign found. Please mention user/s in the user parameter/s.`,
        ephemeral: true,
      });
      return;
    }

    const attachment = interaction.options.getAttachment("document");

    if (attachment.contentType !== "application/pdf") {
      await interaction.reply({
        content: `🔴 ERROR: The attachment should be a PDF file.`,
        ephemeral: true,
      });
      return;
    }

    const member = interaction.guild.members.cache.get(interaction.user.id);

    const modal = new ModalBuilder();

    modal.setCustomId("signRequest").setTitle(`Request a docment signature`);

    const title = new TextInputBuilder()
      .setCustomId(`title`)
      .setLabel(`Document Title`)
      .setPlaceholder("The subject/title of the document.")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const addon = new TextInputBuilder()
      .setCustomId(`additional`)
      .setLabel(`Additional Details`)
      .setPlaceholder(
        "(OPTIONAL) Add description/reminders for the document or recipients."
      )
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false);

    const firstRow = new ActionRowBuilder().addComponents(title);
    const secondRow = new ActionRowBuilder().addComponents(addon);
    modal.addComponents(firstRow, secondRow);

    await interaction.showModal(modal);

    const modalResponse = await interaction.awaitModalSubmit({
      filter: async (i) => {
        const f =
          i.customId === "signRequest" && i.user.id === interaction.user.id;

        if (f) {
          await i.deferReply();
        }
        return f;
      },
      time: 60000,
    });

    try {
      if (modalResponse.isModalSubmit()) {
        const title = modalResponse.fields.getTextInputValue("title");
        const description =
          modalResponse.fields.getTextInputValue("additional");

        const buttonRow = new ActionRowBuilder();

        const submit = new ButtonBuilder()
          .setCustomId("documentSign")
          .setLabel("Submit")
          .setStyle(ButtonStyle.Success);

        const cancel = new ButtonBuilder()
          .setCustomId("documentCancel")
          .setLabel("Cancel")
          .setStyle(ButtonStyle.Danger);

        const link = new ButtonBuilder()
          .setLabel("View Document")
          .setURL(attachment.url)
          .setStyle(ButtonStyle.Link);

        buttonRow.addComponents(submit, cancel, link);

        const userFields = interaction.options._hoistedOptions
          .filter((i) => i.type === 6)
          .map((user, i) => ({
            name: `⌛ Signature #${i + 1}`,
            value: `${user.user.toString()}`,
          }));

        const embed = new EmbedBuilder()
          .setTimestamp(Date.now())
          .setFooter({
            iconURL: member.displayAvatarURL(),
            text: `Prepared By: ${member.nickname}`,
          })
          .setTitle(title)
          .setAuthor({
            name: nanoid(),
          })
          .setURL(attachment.url)
          .addFields(userFields)
          .setColor("Blue");

        if (description) {
          embed.setDescription(description);
        }

        await modalResponse.editReply({
          embeds: [embed],
          components: [buttonRow],
        });
      }
    } catch (error) {
      console.log(error);
      await modalResponse.editReply({
        content: `🔴 ERROR: An error occurred while creating your signature request. Please try again.`,
      });
    }
  },
};
