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
  },
};
