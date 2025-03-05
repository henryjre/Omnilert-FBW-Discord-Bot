module.exports = {
  name: "messageCreate",
  async execute(message, client) {
    if (message.author.bot) {
      return;
    }
    if (message.member.roles.cache.has("1117791688832860182")) {
      return;
    }

    // if (process.env.node_env === "dev") return;

    const thread = message.guild.channels.cache.find(
      (channel) => channel.isThread() && channel.id === message.channel.id
    );

    if (thread) {
      if (thread.name.includes("Proof Upload")) {
        return await client.events
          .get("incidentProofUpload")
          .execute(message, thread, client);
      }
    }
  },
};
