const { EmbedBuilder } = require("discord.js");
const moment = require("moment");

module.exports = {
  name: "approveCommission",
  async execute(reaction, user, client) {
    const member = reaction.message.guild.members.cache.get(user.id);
    const message = await reaction.message.channel.messages.fetch(
      reaction.message.id
    );

    const validRoles = ["1174612428206641182"];

    if (!member.roles.cache.some((r) => validRoles.includes(r.id))) return;

    let withdrawalEmbed = message.embeds[0].data;

    const reqTime = moment(withdrawalEmbed.timestamp).format(
      "MMM D, YYYY, h:mm A"
    );

    withdrawalEmbed.fields.push({
      name: "REQUEST DATE",
      value: reqTime,
    });

    const newEmbed = new EmbedBuilder()
      .setTitle("✅ APPROVED COMMISSION WITHDRAWAL")
      .setColor("Green")
      .setTimestamp(Date.now())
      .setFooter({
        text: `APPROVED BY: ${user.globalName}`,
      })
      .addFields(withdrawalEmbed.fields);

    client.channels.cache
      .get("1176498024684466247")
      .send({
        embeds: [newEmbed],
      })
      .then((msg) => {
        msg.react("✅");
        message.delete();
      });
  },
};
