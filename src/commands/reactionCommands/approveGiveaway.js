const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "approveGiveaway",
  async execute(reactedMessage, user, client) {
    const member = reaction.message.guild.members.cache.get(user.id);

    const validRoles = ["1174612428206641182"];

    if (!member.roles.cache.some((r) => validRoles.includes(r.id))) return;
    let cashbackEmbed = reactedMessage.embeds[0].data;

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
      .setTitle("✅ APPROVED DAILY GIVEAWAY")
      .setColor(cashbackEmbed.color)
      .setTimestamp(Date.now())
      .setFooter({
        text: `APPROVED BY: ${user.globalName}`,
      })
      .addFields(cashbackEmbed.fields);

    client.channels.cache
      .get("1171798156971884585")
      .send({
        embeds: [newEmbed],
      })
      .then((msg) => {
        msg.react("✅");
        reactedMessage.delete();
      });
  },
};
