const {
  SlashCommandBuilder,
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const msg = `
# Welcome to the Omnilert FBW Discord Server! :wave:

To continue with your Discord onboarding, below are the following links that you may need.

## :clapper: Discord Guide Video
> A 20-minute video guide for people who are new to discord. This video contains the important things you need to know about Discord.

https://drive.google.com/file/d/1-2iHw95g-cwEPWPUq54N_Kq1CtCzMgU-/view?usp=sharing

## :pencil: Discord Guide Documentation
> This is a written documentation that has the things you need to know to familiarize with the Discord application

https://docs.google.com/document/d/18uEPbgeWJjPXr91wOkMyFGQqOlJBA0PxgJ8UdQTNAg4/edit?usp=sharing

Should you need to learn more or ask questions, feel free to send a message to the <#1337236598269415496> channel or mention <@748568303219245117>

To become part of Omnilert discord, click the **JOIN** button below and submit your **\`full name\`** and your **\`active email address\`**.
`;

const botRoleId = "1343052940818255986";

module.exports = {
  data: new SlashCommandBuilder().setName("welcome_message"),
  pushToArray: false,
  async execute(message, client) {
    const botRole = await message.guild.roles.cache.get(botRoleId);

    const embed = new EmbedBuilder()
      .setDescription(msg)
      .setColor(botRole.color);

    const join = new ButtonBuilder()
      .setCustomId("welcomeJoinButton")
      .setLabel("Join")
      .setStyle(ButtonStyle.Success);

    const buttonRow = new ActionRowBuilder().addComponents(join);

    await message.channel.send({
      embeds: [embed],
      components: [buttonRow],
    });
  },
};
