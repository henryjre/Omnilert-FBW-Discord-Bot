const { EmbedBuilder } = require("discord.js");
const fs = require("fs").promises;
const path = require("path");

const filePath = path.join(__dirname, "../../../temp/pbrSubmissions.json");

module.exports = {
  data: {
    name: `pbrSubmit`,
  },
  async execute(interaction, client) {
    await interaction.deferUpdate();

    const messageEmbed = interaction.message.embeds[0].data;

    const embedId = messageEmbed.author.name;
    const pbrField = messageEmbed.fields.find(
      (f) => f.name === "Calculated PBR"
    );
    const pbrString = pbrField.value;
    const pbrValue = parseFloat(pbrString.match(/[\d.]+/));

    const dmChannel = await client.channels.cache.get(interaction.channelId);

    try {
      const votingChannel = await client.channels.cache.get(
        "1186662402247368704"
      );
      const votingMessage = await votingChannel.messages
        .fetch()
        .then((messages) => {
          return messages
            .filter(
              (m) =>
                m.author.bot &&
                m.embeds.length > 0 &&
                m.embeds[0].data.author &&
                m.embeds[0].data.author.name === embedId
            )
            .first();
        });

      const votingEmbed = votingMessage.embeds[0].data;
      votingEmbed.fields[2].value = String(
        Number(votingEmbed.fields[2].value) + 1
      );

      await votingMessage.edit({
        embeds: [votingEmbed],
      });

      const dmMessages = await dmChannel.messages.fetch({ limit: 2 });

      const interactedMember = await client.guilds.cache
        .get("1049165537193754664")
        .members.cache.get(interaction.user.id);

      const anonEmbed = new EmbedBuilder(messageEmbed).setFooter({
        text: `ANONYMOUS SUBMISSION`,
      });

      const notAnonEmbed = new EmbedBuilder(messageEmbed).setFooter({
        text: `SUBMITTED BY: ${interactedMember.nickname}`,
        iconURL: interaction.user.displayAvatarURL(),
      });

      await storePbrSubmission({
        userId: interaction.user.id,
        finalPbr: parseFloat(pbrValue),
        anonRemarks: anonEmbed,
        publicRemarks: notAnonEmbed,
      });

      await interactedMember.roles.add("1186987728336846958");

      await dmMessages.forEach((m) => {
        setTimeout(() => {
          m.delete();
        }, 1000);
      });

      await dmChannel
        .send({
          content: `Your __**PBR RATING**__ was successfully submitted!`,
        })
        .then((m) => {
          setTimeout(() => {
            m.delete();
          }, 10000);
        });
    } catch (error) {
      console.log(error);
      await dmChannel
        .send({
          content: `There was an error while submitting your __**PBR RATING**__. Please try again`,
        })
        .then((m) => {
          setTimeout(() => {
            m.delete();
          }, 10000);
        });
    }
  },
};

async function storePbrSubmission(jsonObject) {
  try {
    // Read existing data
    const existingData = await fs.readFile(filePath, "utf-8");

    // Parse existing data (or initialize as an empty array if the file is empty)
    const existingArray = existingData ? JSON.parse(existingData) : [];

    // Append the new JSON object
    existingArray.push(jsonObject);

    // Write back to the file
    await fs.writeFile(filePath, JSON.stringify(existingArray));
    console.log("Vote stored successfully.");
  } catch (error) {
    console.error("Error storing Vote:", error);
  }
}
