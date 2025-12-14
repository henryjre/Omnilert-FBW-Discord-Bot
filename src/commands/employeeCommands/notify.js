const { SlashCommandBuilder } = require('discord.js');

const sqliteDb = require('../../sqliteConnection.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('notify')
    .setDescription('Notify someone or something...')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('employee')
        .setDescription('Notify an employee.')
        .addStringOption((option) =>
          option
            .setName('option')
            .setDescription('Select the notification option.')
            .setRequired(true)
            .setChoices([
              {
                name: '🚫 Deduction/Penalties',
                value: 'penalty',
              },
            ])
        )
        .addUserOption((option) =>
          option
            .setName('employee')
            .setDescription('Select the penalized employee')
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName('mode-of-deduction')
            .setDescription('Select the mode of deduction.')
            .setRequired(true)
            .setChoices([
              {
                name: '💰 Salary',
                value: 'salary',
              },
              {
                name: '🪙 Token Pay Balance',
                value: 'token_pay',
              },
            ])
        )
    ),
  async execute(interaction, client) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'employee':
        await notifyEmployeeCommand(interaction, client);
        break;

      //   case "cash":
      //     await runCashRequestsCommand(interaction, client);
      //     break;

      default:
        break;
    }
  },
};

async function notifyEmployeeCommand(interaction, client) {
  const memberSelected = interaction.options.getMember('employee');

  const option = interaction.options.getString('option');
  const employee_id = memberSelected.user.id;
  const mode = interaction.options.getString('mode-of-deduction');

  const deleteQuery = sqliteDb.prepare(`DELETE FROM penalty_payloads WHERE id = ?`);
  deleteQuery.run(interaction.user.id); // Delete old data

  const insert = sqliteDb.prepare(
    `INSERT INTO penalty_payloads (id, employee_id, option, mode) VALUES (?, ?, ?, ?)`
  );
  insert.run(interaction.user.id, employee_id, option, mode);

  return await client.commands.get(option)?.execute(interaction, client);
}
