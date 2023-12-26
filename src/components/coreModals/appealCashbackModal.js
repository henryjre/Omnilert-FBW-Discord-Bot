module.exports = {
  data: {
    name: `proposalResolutionModal`,
  },
  async execute(interaction, client) {
    await interaction.deferUpdate();
    const appealReason = interaction.fields.getTextInputValue("appealReason");
    const member = interaction.guild.members.cache.get(interaction.user.id);
    const message = await interaction.message.channel.messages.fetch(
      interaction.message.id
    );

    let messageEmbed = interaction.message.embeds[0];

    const url = `https://www.leviosa.ph/_functions/approveOrAppealCashback`;
    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.apiKey,
      },
      body: JSON.stringify({
        order_id: messageEmbed.data.fields[0].value,
        type: "appeal",
        reason: appealReason,
      }),
    };

    const response = await fetch(url, options)
      .then((res) => res.json())
      .catch((err) => {
        interaction.followUp({
          content:
            "🔴 FETCH ERROR: An error has occured while fetching secret tokens.",
        });
        return;
      });

    if (!response.ok) {
      interaction.followUp({
        content: `🔴 ERROR: ${response.message}.`,
      });
      return;
    }

    messageEmbed.data.fields.push({
      name: "Appeal Reason",
      value: appealReason,
    });
    messageEmbed.data.color = 15746887;
    messageEmbed.title = "🔴 Cashback Appealed";

    messageEmbed.footer = {
      text: `APPEALED BY: ${member.nickname}`,
    };

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
