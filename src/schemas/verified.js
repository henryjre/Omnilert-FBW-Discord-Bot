const { Schema, model } = require("mongoose");
const id = new Date().getTime();

const verifiedSchema = new Schema({
  _id: { type: String, default: `LEV${id}IOSA` },
  profileName: String,
  balance: Number,
  referrer: { type: String, default: "None" },
  firstRef: { type: Number, default: 0 },
  secondRef: { type: Number, default: 0 },
  thirdRef: { type: Number, default: 0 },
  fourthRef: { type: Number, default: 0 },
  fifthRef: { type: Number, default: 0 },
  sixthRef: { type: Number, default: 0 },
});

module.exports = model("Verified", verifiedSchema, "Verified Members");
