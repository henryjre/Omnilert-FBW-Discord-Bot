require("dotenv").config({ path: "src/.env" });

const formatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});
///// FOR EMAILS
const handlebars = require("handlebars");
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");

module.exports = async (req, res) => {
  const { order } = req.body;

  const filePath = path.join(__dirname, "./email_htmls/orderCreate.html");
  const source = fs.readFileSync(filePath, "utf-8").toString();
  let template = handlebars.compile(source);
  const replacements = {
    orderId: queryOrder.number,
    orderDate: orderDate,
    memberName: `${queryOrder.shippingInfo.shipmentDetails.firstName} ${queryOrder.shippingInfo.shipmentDetails.lastName}`,
    memberPhone: queryOrder.shippingInfo.shipmentDetails.phone,
    memberEmail: queryOrder.shippingInfo.shipmentDetails.email,
    leviosaId: queryOrder.customField.value,
    shippingAddress: `${address.addressLine}, ${address.addressLine2}, ${address.city}, Philippines ${address.postalCode}`,
    itemsArray: JSON.stringify(lineItemsArray),
  };
  const htmlToSend = template(replacements);

  let transporter = nodemailer.createTransport({
    host: "smtp.zoho.com",
    port: 465,
    secure: true, //ssl
    auth: {
      user: "info@leviosanetwork.com",
      pass: zmailPass,
    },
    from: "info@leviosanetwork.com",
  });

  const mailOptions = {
    from: "Leviosa Network <info@leviosanetwork.com>",
    to: queryOrder.shippingInfo.shipmentDetails.email,
    subject: `Thanks for shopping with us (#${queryOrder.number})`,
    html: htmlToSend,
  };

  await transporter
    .sendMail(mailOptions)
    .then((results) => console.log(results));

  const lineItemsArray = JSON.parse(`{{itemsArray}}`);
  const lineItemsTable = document.getElementById("lineItems");
  lineItemsArray.forEach((item) => {
    const image = item.imageUrl;
    const itemName = item.name;
    const itemQuantity = item.quantity;
    const itemPrice = item.price;

    const lineItemRow = `<tr>
      <td
        align="left"
        valign="top"
        style="
          border-collapse: collapse;
          border-spacing: 0;
          padding-top: 10px;
        "
      >
        <img
          border="0"
          vspace="0"
          hspace="0"
          style="
            padding: 0;
            margin: 0;
            outline: none;
            text-decoration: none;
            -ms-interpolation-mode: bicubic;
            border: none;
            display: block;
            color: #000000;
          "
          src=${'"' + image + '"'}
          alt="P"
          title="Product Image"
          width="100"
          height="100"
        />
      </td>
      <td
        align="left"
        width="300"
        valign="top"
        style="
          font-size: 15px;
          font-weight: 400;
          line-height: 120%;
          border-collapse: collapse;
          border-spacing: 0;
          margin: 0;
          padding: 0;
          padding-left: 5px;
          padding-right: 5px;
          padding-top: 10px;
          color: #000000;
          font-family: 'Trebuchet MS', 'Lucida Sans Unicode',
            'Lucida Grande', 'Lucida Sans', Arial, sans-serif;
        "
        class="paragraph"
      >
        <b style="color: #333333"
          >${itemName}</b
        >
      </td>
      <td
        align="center"
        width="100"
        valign="top"
        style="
          border-collapse: collapse;
          border-spacing: 0;
          margin: 0;
          padding: 0;
          padding-left: 0px;
          padding-right: 0px;
          font-size: 15px;
          font-weight: 400;
          line-height: 150%;
          padding-top: 10px;
          font-family: 'Trebuchet MS', 'Lucida Sans Unicode',
            'Lucida Grande', 'Lucida Sans', Arial, sans-serif;
          color: #000000;
        "
      >
        QTY: ${itemQuantity}
      </td>
      <td
        align="center"
        width="100"
        valign="top"
        style="
          border-collapse: collapse;
          border-spacing: 0;
          margin: 0;
          padding: 0;
          padding-left: 0px;
          padding-right: 0px;
          font-size: 15px;
          font-weight: 400;
          line-height: 150%;
          padding-top: 10px;
          font-family: 'Trebuchet MS', 'Lucida Sans Unicode',
            'Lucida Grande', 'Lucida Sans', Arial, sans-serif;
          color: #000000;
        "
      >
        ${itemPrice}
      </td>
      </tr>`;
    lineItemsTable.innerHTML += lineItemRow;
  });
};
