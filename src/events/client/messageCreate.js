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

    const departments = [
      {
        department: "Executive Head",
        userIds: ["864920050691866654"],
        officeChannelId: "1203998793473728572",
      },
      {
        department: "Operations",
        userIds: [
          "762612635605663767",
          "1201413097697591327",
          "1203686117778657340",
        ],
        officeChannelId: "1117386962580541473",
      },
      {
        department: "Procurement",
        userIds: ["851719358430576641"],
        officeChannelId: "1117386986374823977",
      },
      {
        department: "Design",
        userIds: ["719135399859060796"],
        officeChannelId: "1117387017089728512",
      },
      {
        department: "Web Development",
        userIds: ["748568303219245117"],
        officeChannelId: "1117387044696641607",
      },
      {
        department: "Finance",
        userIds: ["1120869673974649035"],
        officeChannelId: "1118180874136059964",
      },
      {
        department: "Livestream",
        userIds: ["938140159541665842"],
        officeChannelId: "1185979300936155136",
      },
      {
        department: "Tiktok Account",
        userIds: ["752713584148086795", "1187593501609832508"],
        officeChannelId: "1185979374198071436",
      },
      {
        department: "Tiktok Seller Center",
        userIds: ["756483149411909693"],
        officeChannelId: "1185979531216027730",
      },
      {
        department: "Lazada Seller Center",
        userIds: ["841943205624283136"],
        officeChannelId: "1197118556467376188",
      },
      {
        department: "Shopee Seller Center",
        userIds: ["1196432863751577690"],
        officeChannelId: "1197118789855223888",
      },
      {
        department: "Supply Chain Management",
        userIds: ["1207935798301823001"],
        officeChannelId: "1209039670927826975",
      },
    ];

    const thread = message.guild.channels.cache.find(
      (channel) => channel.isThread() && channel.id === message.channel.id
    );

    if (thread) {
      switch (thread.id) {
        // shopee
        case "1218216761325781143":
          return await client.events
            .get("inventoryIn")
            .execute(message, thread, client, "SHOPEE");
        case "1218216406034939916":
          return await client.events
            .get("inventoryOut")
            .execute(message, thread, client, "SHOPEE");
        // lazada
        case "1218216584510836797":
          return await client.events
            .get("inventoryIn")
            .execute(message, thread, client, "LAZADA");
        case "1218216524532289627":
          return await client.events
            .get("inventoryOut")
            .execute(message, thread, client, "LAZADA");
        // tiktok
        case "1218216960618139739":
          return await client.events
            .get("inventoryIn")
            .execute(message, thread, client, "TIKTOK");
        case "1218216899318648952":
          return await client.events
            .get("inventoryOut")
            .execute(message, thread, client, "TIKTOK");

        default:
          break;
      }

      const department = departments.find(
        (d) => d.officeChannelId === thread.parentId
      );

      if (department) {
        if (department.userIds.includes(message.author.id)) {
          return client.commands
            .get("reportal")
            .execute(message, thread.id, client, 0);
        }
      }
    }
  },
};
