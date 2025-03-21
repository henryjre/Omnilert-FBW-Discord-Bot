const {
  SlashCommandBuilder,
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
  EmbedBuilder,
} = require("discord.js");

const message = `
# Welcome to the Omnilert FBW Discord Server! 👋

To continue with your Discord onboarding, below are the following links that you may need.

## 🎬 Discord Guide Video
> A 20-minute video guide for people who are new to discord. This video contains the important things you need to know about Discord.

https://drive.google.com/file/d/1-2iHw95g-cwEPWPUq54N_Kq1CtCzMgU-/view?usp=sharing

## 📝 Discord Guide Documentation
> This is a written documentation that has the things you need to know to familiarize with the Discord application

https://docs.google.com/document/d/18uEPbgeWJjPXr91wOkMyFGQqOlJBA0PxgJ8UdQTNAg4/edit?usp=sharing

Should you need to learn more or ask questions, feel free to send a message to the <@#1314821211955400764> channel under the Technology Development category.

To become part of Omnilert discord, click the **Join** button and submit your **full name** and your **active email address**.
`;

module.exports = {
  data: new SlashCommandBuilder().setName("penalty"),
  pushToArray: false,
  async execute(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const embed = new EmbedBuilder.setDescription(message).setColor(
      client.user.accentColor.toString(16)
    );

    const submit = new ButtonBuilder()
      .setCustomId("joinButton")
      .setLabel("Join")
      .setStyle(ButtonStyle.Success);

    const buttonRow = new ActionRowBuilder().addComponents(submit, cancel);
  },
};
