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

  const {
    id,
    timestamp,
    member_id,
    full_name,
    proof_of_payment,
    payment_type,
    amount,
    status,
    reference_number,
    verifier,
  } = req.body;

  if (reference_number === "none") {
    const queryRefDetails =
      "SELECT STATUS, VERIFIER FROM Pending_Payment WHERE _id = ?";
    const personalDetails = await connection
      .query(queryRefDetails, [id])
      .catch((err) => console.log(err));

    if (personalDetails[0].length <= 0) {
      connection.end();
      return res.status(404).send({
        ok: false,
        message: "🔴 Oops! Could not find the item you were getting.",
      });
    }

    if (
      personalDetails[0][0]["STATUS"] === "verifying" &&
      personalDetails[0][0]["VERIFIER"].length > 0
    ) {
      connection.end();
      return res.status(200).send({
        ok: true,
        message: "On-hold verifying.",
      });
    } else if (
      personalDetails[0][0]["STATUS"] === "verifying" &&
      personalDetails[0][0]["VERIFIER"] != null
    ) {
      connection.end();
      return res.status(400).send({
        ok: false,
        message: "🔴 Oops! That payment has already been get.",
      });
    }

    const updateQuery =
      "UPDATE Pending_Payment SET STATUS = ?, VERIFIER = ? WHERE _id = ?";
    await connection
      .query(updateQuery, [status, verifier, id])
      .catch((err) => console.log(err));

    connection.end();
    return res.status(200).send({
      ok: true,
      message: "Status Updated.",
    });
  }

  const insertQuery =
    "INSERT INTO Approved_Payments (_id, TIMESTAMP, MEMBER_ID, FULL_NAME, REF_NUMBER, PROOF_OF_PAYMENT, PAYMENT_TYPE, AMOUNT, VERIFIER) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
  await connection
    .query(insertQuery, [
      id,
      timestamp,
      member_id,
      full_name,
      reference_number,
      proof_of_payment,
      payment_type,
      amount,
      verifier,
    ])
    .catch((err) => console.log(err));

  const deleteQuery = "DELETE FROM Pending_Payment WHERE _id = ?";
  await connection.query(deleteQuery, [id]).catch((err) => console.log(err));

  if (payment_type === "Deposit Fee") {
    const queryBalanceDeetails =
      "UPDATE Referral_Details SET REFERRAL_BALANCE = REFERRAL_BALANCE + ? WHERE MEMBER_ID  = ?";
    await connection
      .query(queryBalanceDeetails, [Number(amount), member_id])
      .catch((err) => console.log(err));

    const findBalance =
      "SELECT REFERRAL_BALANCE FROM Referral_Details WHERE MEMBER_ID  = ?";
    const balanceArray = await connection
      .query(findBalance, [member_id])
      .catch((err) => console.log(err));

    const newBalance = balanceArray[0][0]["REFERRAL_BALANCE"];

    const queryTransDetails =
      "UPDATE Transaction_History SET TXN_DATE = ?, AMOUNT = ?, MEMBER_BALANCE = ?, STATUS = ? WHERE _id = ?";
    await connection
      .query(queryTransDetails, [
        timestamp,
        amount,
        newBalance,
        "approved",
        id
      ])
      .catch((err) => console.log(err));
  }

  connection.end();
  return res.status(200).send({
    ok: true,
    message: "Payment approved.",
  });
};
