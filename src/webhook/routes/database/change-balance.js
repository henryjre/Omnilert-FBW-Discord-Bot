require("dotenv").config({ path: "src/.env" });
const mysql = require("mysql2/promise");

module.exports = async (req, res) => {
  const connection = await mysql.createConnection({
    host: process.env.sqlHost,
    user: process.env.sqlUsername,
    password: process.env.sqlPassword,
    database: process.env.sqlDatabase,
    port: process.env.sqlPort,
  });

  const { member_id, txn_amount } = req.body;

  const queryRefDetails =
    "SELECT REFERRAL_BALANCE FROM Referral_Details WHERE MEMBER_ID = ?";
  const referralDetails = await connection
    .query(queryRefDetails, [member_id])
    .catch((err) => consolFe.log(err));

  const balance = referralDetails[0][0]["REFERRAL_BALANCE"];
  let remBal;
  if (txn_amount.includes("-")) {
    const newAmount = txn_amount.replace("- ", "");
    rembal = Number(balance) - Number(newAmount);
  } else if (txn_amount.includes("+")) {
    const newAmount = txn_amount.replace("+ ", "");
    rembal = Number(balance) - Number(newAmount);
  } else {
    return res.status(400).send({
      ok: false,
      message: "Amount parsing error.",
    });
  }

  const queryBalanceDeetails =
    "UPDATE Referral_Details SET REFERRAL_BALANCE = ? WHERE MEMBER_ID = ?";
  await connection
    .query(queryBalanceDeetails, [remBal, member_id])
    .catch((err) => consolFe.log(err));

  connection.end();
  return res.status(200).send({
    ok: true,
    message: "Balance Updated.",
  });
};
