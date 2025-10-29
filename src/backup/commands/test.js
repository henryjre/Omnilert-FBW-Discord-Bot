const {
  SlashCommandBuilder,
  MessageFlags,
  AttachmentBuilder,
  EmbedBuilder
} = require('discord.js');
const fs = require('fs');
const { table } = require('table');

const { odooLogin, jsonRpc } = require('../../odooRpc.js');

const dbName = process.env.odoo_db;
const password = process.env.odoo_password;

module.exports = {
  cooldown: 10,
  data: new SlashCommandBuilder().setName('ping').setDescription('Testing purposes!'),
  async execute(interaction, client) {
    const message = await interaction.deferReply({
      flags: MessageFlags.Ephemeral
    });

    if (!interaction.user.id === '748568303219245117') {
      await interaction.reply({
        content: `🔴 ERROR: This command can only be used by Waffle Man.`,
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    // const getResults = await odooFunc();

    // const updatedData = getResults.data.map((item) => ({
    //   ...item,
    //   threshold_value: 0,
    // }));

    // const formattedJson = JSON.stringify(updatedData, null, 2);

    // const filePath = "products.json";
    // fs.writeFileSync(filePath, formattedJson);

    const data = [
      ['Product Name', 'Quantity', 'Unit'],
      ['PRD - Famous Brownie Batter', '100', 'g'],
      ['SPK1 - Cheese Spread', '-500', 'g'],
      ['SPK1 - Chocolate', '900', 'g']
    ];

    // Table options
    const config = {
      columns: {
        0: { alignment: 'center', width: 30 },
        1: { alignment: 'center', width: 10 },
        2: { alignment: 'center', width: 5 }
      }
    };

    const tableString = '```' + table(data, config) + '```';

    const embed = new EmbedBuilder()
      .setTitle('Inventory Table')
      .setDescription(tableString)
      .setColor(0x00ae86);

    // Send the JSON file as an attachment
    await interaction.channel.send({
      embeds: [embed]
    });

    const newMessage = `API Latency: ${client.ws.ping}\nClient Ping: ${
      message.createdTimestamp - interaction.createdTimestamp
    }`;

    await interaction.channel.send({
      content: newMessage
    });

    await interaction.editReply({
      content: 'Success!'
    });
  }
};

async function odooFunc() {
  // const { category } = req.body;

  try {
    const params = {
      model: 'product.template',
      method: 'search_read',
      domain: [
        ['categ_id', 'in', [31, 9, 7]]
        // ["company_id", "in", [branch.cid]],
      ],
      fields: ['name', 'uom_name', 'id'], //discount mode: per_order, per_point, percent
      offset: null,
      limit: null
      //   order: "date asc",
    };

    const request = await jsonRpc('call', {
      service: 'object',
      method: 'execute',
      args: [
        dbName,
        2,
        password,
        params.model,
        params.method,
        params.domain,
        params.fields,
        params.offset,
        params.limit
        // params.order,
      ]
    });

    if (request.error) {
      throw new Error('rpc_error');
    }

    if (!request.result?.length) {
      throw new Error('no_data_found');
    }

    return { ok: true, message: 'success', data: request.result };
  } catch (error) {
    console.error('Error:', error);
    return { ok: false, message: error.message, data: [] };
  }
}
