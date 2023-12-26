const { EmbedBuilder } = require("discord.js");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

module.exports = {
  data: {
    name: `approveCashback`,
  },
  async execute(interaction, client) {
    const interactionMember = interaction.guild.members.cache.get(
      interaction.user.id
    );
    if (interactionMember.roles.cache.has("1174612428206641182")) {
      await interaction.reply({
        content: `You cannot approve this cashback.`,
        ephemeral: true,
      });
      return;
    }

    await interaction.deferUpdate();

    const message = await interaction.message.channel.messages.fetch(
      interaction.message.id
    );

    let cashbackEmbed = interaction.message.embeds[0].data;

    const url = `https://www.leviosa.ph/_functions/approveOrAppealCashback`;
    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.apiKey,
      },
      body: JSON.stringify({
        order_id: cashbackEmbed.fields[0].value,
        type: "approve",
      }),
    };

    const response = await fetch(url, options)
      .then((res) => res.json())
      .catch((err) => {
        console.log(err)
        interaction.followUp({
          content:
            "🔴 FETCH ERROR: An error has occured while fetching the request.",
        });
        return;
      });

      console.log(response)

    if (!response.ok) {
      interaction.followUp({
        content: `🔴 ERROR: ${response.message}.`,
      });
      return;
    }

    const reqTime = new Date(cashbackEmbed.timestamp).toLocaleDateString(
      "en-PH",
      {
        timeZone: "Asia/Manila",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        hour12: true,
      }
    );

    cashbackEmbed.fields.push({
      name: "REQUEST DATE",
      value: reqTime,
    });

    const newEmbed = new EmbedBuilder()
      .setTitle("✅ APPROVED CASHBACK")
      .setColor(cashbackEmbed.color)
      .setTimestamp(Date.now())
      .setFooter({
        text: `APPROVED BY: ${interactionMember.nickname}`,
      })
      .addFields(cashbackEmbed.fields);

    await client.channels.cache
      .get("1171463935904448613")
      .send({
        embeds: [newEmbed],
      })
      .then((msg) => {
        msg.react("✅");
        message.delete();
      });
  },
};
