module.exports = {
  name: "messageCreate",
  async execute(message, client) {
    if (message.author.bot) {
      return;
    }
    if (message.channelId === "1049166465049309224") {
      return client.commands.get("inventory-out").execute(message, client);
    }
    if (message.channelId === "1049167086481580032") {
      return client.commands.get("audit").execute(message, client);
    }
    if (message.channelId === "1049166582829559918") {
      return client.commands.get("rts").execute(message, client);
    }

    const channelIds = [
      "1117386962580541473",
      "1117386986374823977",
      "1117387017089728512",
      "1117387044696641607",
      "1053860453853433860",
    ];

    if (channelIds.includes(message.channelId)) {
      return client.commands.get("reminder").execute(message, client, 0);
    }
  },
};
