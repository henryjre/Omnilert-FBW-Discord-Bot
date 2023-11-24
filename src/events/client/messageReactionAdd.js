module.exports = {
  name: "messageReactionAdd",
  async execute(reaction, user, client) {
    if (user.bot) return;
    const message = await reaction.message;

    if (message.channelId === "1171463711156862986") {
      return client.commands
        .get("approveCashback")
        .execute(reaction, user, client);
    }

    if (message.channelId === "1171798094900379740") {
      return client.commands
        .get("approveGiveaway")
        .execute(reaction, user, client);
    }

    if (message.channelId === "1176497779040858173") {
      return client.commands
        .get("approveCommission")
        .execute(reaction, user, client);
    }
  },
};
