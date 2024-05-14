const officeIds = [
  "1203998793473728572",
  "1117386962580541473",
  "1117387017089728512",
  "1118180874136059964",
  "1117387044696641607",
  "1185979300936155136",
  "1185979374198071436",
  "1185979531216027730",
  "1197118556467376188",
  "1197118789855223888",
  "1209039670927826975",
  "1178280048839639110", //testing channel
];

module.exports = {
  name: "threadUpdate",
  async execute(oldThread, newThread, client) {
    if (!officeIds.includes(newThread.parentId)) return;

    if (newThread.locked && newThread.archived) {
      const parentChannel = await client.channels.cache.get(newThread.parentId);

      const channelThreads = parentChannel.threads;
      const activeThreads = await channelThreads.fetchActive();
      if (activeThreads.threads.size <= 0) {
        const newChannelName = parentChannel.name.replace("🟢", "🔴");
        await parentChannel.setName(newChannelName);
      }
    }
  },
};
