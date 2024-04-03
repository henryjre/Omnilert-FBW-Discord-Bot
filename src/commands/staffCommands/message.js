const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuOptionBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");

const { customAlphabet } = require("nanoid");
const nanoid = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZ", 6);

module.exports = {
  data: new SlashCommandBuilder()
    .setName("message")
    .setDescription("Reply to/Start a conversation.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("tiktok-chat")
        .setDescription("Reply to/Start a tiktok chat conversation")
        .addAttachmentOption((option) =>
          option
            .setName("image-1")
            .setDescription("The image you want to send")
            .setRequired(false)
        )
        .addAttachmentOption((option) =>
          option
            .setName("image-2")
            .setDescription("The image you want to send")
            .setRequired(false)
        )
        .addAttachmentOption((option) =>
          option
            .setName("image-3")
            .setDescription("The image you want to send")
            .setRequired(false)
        )
    ),
  // .addUserOption((option) =>
  //   option
  //     .setName("signing-user-1")
  //     .setDescription("The first user to sign.")
  //     .setRequired(false)
  // )
  // .addUserOption((option) =>
  //   option
  //     .setName("signing-user-2")
  //     .setDescription("The second user to sign.")
  //     .setRequired(false)
  // )
  // .addUserOption((option) =>
  //   option
  //     .setName("signing-user-3")
  //     .setDescription("The third user to sign.")
  //     .setRequired(false)
  // )
  // .addUserOption((option) =>
  //   option
  //     .setName("signing-user-4")
  //     .setDescription("The fourth user to sign.")
  //     .setRequired(false)
  // )
  // .addUserOption((option) =>
  //   option
  //     .setName("signing-user-5")
  //     .setDescription("The fifth user to sign.")
  //     .setRequired(false)
  // ),

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

    // if (
    //   interaction.options._hoistedOptions.filter((i) => i.type === 6).length <=
    //   0
    // ) {
    //   await interaction.reply({
    //     content: `🔴 ERROR: No user/s to sign found. Please mention user/s in the user parameter/s.`,
    //     ephemeral: true,
    //   });
    //   return;
    // }

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
          .setDisabled(true)
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

        // const userFields = interaction.options._hoistedOptions
        //   .filter((i) => i.type === 6)
        //   .map((user, i) => ({
        //     name: `⌛ Signature #${i + 1}`,
        //     value: `${user.user.toString()}`,
        //   }));

        const typeMenu = new StringSelectMenuBuilder()
          .setCustomId("documentTypeMenu")
          .setOptions([
            new StringSelectMenuOptionBuilder()
              .setLabel("Noted By")
              .setValue("Noted By"),
            new StringSelectMenuOptionBuilder()
              .setLabel("Processed By")
              .setValue("Processed By"),
            new StringSelectMenuOptionBuilder()
              .setLabel("Approved By")
              .setValue("Approved By"),
            new StringSelectMenuOptionBuilder()
              .setLabel("Released By")
              .setValue("Released By"),
          ])
          .setPlaceholder("Select the role of the signing user.");

        const typeRow = new ActionRowBuilder().addComponents(typeMenu);

        const embed = new EmbedBuilder()
          .setTimestamp(Date.now())
          .setFooter({
            iconURL: member.displayAvatarURL(),
            text: "Leviosa Philippines",
          })
          .setTitle(title)
          .setAuthor({
            name: nanoid(),
          })
          .setURL(attachment.url)
          .addFields([
            {
              name: "Prepared By",
              value: member.toString(),
            },
          ])
          // .addFields(userFields)
          .setColor("Blue");

        if (description) {
          embed.setDescription(description);
        }

        await modalResponse.editReply({
          embeds: [embed],
          components: [buttonRow, typeRow],
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
