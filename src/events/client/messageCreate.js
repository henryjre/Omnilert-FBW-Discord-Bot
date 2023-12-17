module.exports = {
  name: "messageCreate",
  async execute(message, client) {
    if (message.author.bot) {
      return;
    }
    if (message.member.roles.cache.has("1117791688832860182")) {
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

    const channelIds = {
      "1117386962580541473": "762612635605663767",
      "1117386986374823977": "851719358430576641",
      "1117387017089728512": "719135399859060796",
      "1117387044696641607": "748568303219245117",
      "1118180874136059964": "1120869673974649035",
      "1185979531216027730": "756483149411909693",
      "1185979300936155136": "938140159541665842",
      "1185979374198071436": "752713584148086795",
    };

    if (Object.keys(channelIds).includes(message.channelId)) {
      if (message.author.id === channelIds[message.channelId]) {
        return client.commands.get("reminder").execute(message, client, 0);
      }
    }
  },
};
