module.exports = {
  name: "messageCreate",
  async execute(message, client) {
    if (message.author.bot) {
      return;
    }
    if (message.member.roles.cache.has("1117791688832860182")) {
      return;
    }

    if (process.env.node_env === "dev") return;

    const departments_executives = [
      {
        department: "Executive Head",
        userId: "864920050691866654",
        officeChannelId: "1203998793473728572",
      },
      {
        department: "Operations",
        userId: "1201413097697591327",
        officeChannelId: "1117386962580541473",
      },
      {
        department: "Design",
        userId: "719135399859060796",
        officeChannelId: "1117387017089728512",
      },
      {
        department: "Web Development",
        userId: "748568303219245117",
        officeChannelId: "1117387044696641607",
      },
      {
        department: "Finance",
        userId: "1120869673974649035",
        officeChannelId: "1118180874136059964",
      },
      {
        department: "Livestream",
        userId: "938140159541665842",
        officeChannelId: "1185979300936155136",
      },
      {
        department: "Tiktok Account",
        userId: "752713584148086795",
        officeChannelId: "1185979374198071436",
      },
      {
        department: "Tiktok Seller Center",
        userId: "756483149411909693",
        officeChannelId: "1185979531216027730",
      },
      {
        department: "Lazada Seller Center",
        userId: "841943205624283136",
        officeChannelId: "1197118556467376188",
      },
      {
        department: "Shopee Seller Center",
        userId: "1196432863751577690",
        officeChannelId: "1197118789855223888",
      },
      {
        department: "Supply Chain Management",
        userId: "1207935798301823001",
        officeChannelId: "1209039670927826975",
      },
    ];

    const departments_associates = [
      {
        department: "Operations",
        userIds: ["1203686117778657340", "762612635605663767"],
        officeChannelId: "1117386962580541473",
      },
      {
        department: "Design",
        userIds: ["754997638415253575"],
        officeChannelId: "1117387017089728512",
      },
      {
        department: "Tiktok Account",
        userIds: ["1187593501609832508"],
        officeChannelId: "1185979374198071436",
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

      const executive_department = departments_executives.find(
        (d) => d.officeChannelId === thread.parentId
      );

      const associate_department = departments_associates.find(
        (d) => d.officeChannelId === thread.parentId
      );

      if (executive_department) {
        if (executive_department.userId === message.author.id) {
          return client.events
            .get("reportal")
            .execute(message, thread.id, client, 0);
        }
      }

      if (associate_department) {
        if (associate_department.userIds.includes(message.author.id)) {
          return client.commands
            .get("reportal")
            .execute(message, thread.id, client, 0);
        }
      }
    }
  },
};
