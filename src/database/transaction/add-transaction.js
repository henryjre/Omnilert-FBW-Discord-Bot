require("dotenv").config({ path: "src/.env" });
const mysql = require("mysql2/promise");
const nanoid = require("nano-id");

module.exports = async function addTransactionHistory(
  date,
  levID,
  description,
  details,
  amount,
  remaining_balance,
  res
) {
  const connection = await mysql.createConnection({
    host: process.env.sqlHost,
    user: process.env.sqlUsername,
    password: process.env.sqlPassword,
    database: process.env.sqlDatabase,
    port: process.env.sqlPort,
  });

  const txnId = `tx-${date}`;
  const leviosaTxnId = await nanoid.customAlphabet(
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    10
  );

  const queryTransDetails =
    "INSERT INTO Transaction_History (_id, TRANSACTION_ID, MEMBER_ID, TXN_DATE, TXN_DESCRIPTION, AMOUNT, TXN_DETAILS, MEMBER_BALANCE) VALUES (?, ?, ?, ?, ?)";
  await connection
    .query(queryTransDetails, [
      txnId,
      leviosaTxnId,
      levID,
      date,
      description,
      amount,
      details,
      remaining_balance,
    ])
    .catch((err) => console.log(err));

  connection.end();
  return res.status(200).send({
    ok: true,
    message: "Transaction added to database.",
  });
};
