require("dotenv").config({ path: "src/.env" });
const mysql = require("mysql2/promise");
const { customAlphabet } = require("nano-id");

module.exports = async (req, res) => {
  const {
    txn_date,
    member_id,
    txn_description,
    txn_details,
    txn_amount,
    txn_rembal,
  } = req.body;

  const connection = await mysql.createConnection({
    host: process.env.sqlHost,
    user: process.env.sqlUsername,
    password: process.env.sqlPassword,
    database: process.env.sqlDatabase,
    port: process.env.sqlPort,
  });

  const txnId = `tx-${date}`;
  const leviosaTxnId = await customAlphabet(
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    10
  );

  const queryTransDetails =
    "INSERT INTO Transaction_History (_id, TRANSACTION_ID, MEMBER_ID, TXN_DATE, TXN_DESCRIPTION, AMOUNT, TXN_DETAILS, MEMBER_BALANCE) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
  await connection
    .query(queryTransDetails, [
      txnId,
      leviosaTxnId,
      member_id,
      txn_date,
      txn_description,
      txn_amount,
      txn_details,
      txn_rembal,
    ])
    .catch((err) => console.log(err));

  connection.end();
  return res.status(200).send({
    ok: true,
    message: "Transaction added to database.",
  });
};
