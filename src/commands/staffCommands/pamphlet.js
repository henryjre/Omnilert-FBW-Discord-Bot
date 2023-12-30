const { SlashCommandBuilder, AttachmentBuilder } = require("discord.js");
const { createCanvas, loadImage, registerFont } = require("canvas");
const sharp = require("sharp");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

module.exports = {
  data: new SlashCommandBuilder()
    .setName("pamphlet")
    .setDescription("Returns an edited pamphlet based on SKU provided.")
    .addStringOption((option) =>
      option
        .setName("sku")
        .setDescription("The sku of the product to generate.")
        .setRequired(true)
    ),
  async execute(interaction, client) {
    const sku = interaction.options.getString("sku");

    const url = `https://leviosa.ph/_functions/getProductInformation?sku=${sku}`;
    const options = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.apiKey,
      },
    };

    await interaction.deferReply();

    try {
      const response = await fetch(url, options);
      const responseData = await response.json();

      if (!response.ok) {
        return await interaction.editReply({
          content: "🔴 FETCH ERROR: " + responseData.error,
        });
      }

      const product = responseData.product;
      const productName = product.name;
      const productMedia = product.mediaItems.map(
        (obj) => `https://static.wixstatic.com/media/${obj.id}`
      );

      const productRedPrice = Number(product.price);
      const productMainPrice = Number(
        product.additionalInfoSections[0].description
      );

      const percentageDiscount = `-${Math.ceil(
        ((productMainPrice - productRedPrice) / productMainPrice) * 100
      )}%`;

      registerFont("src/canvas/pamphlet/fonts/WixMadeforText-Regular.ttf", {
        family: "MadeforRegular",
      });
      registerFont("src/canvas/pamphlet/fonts/WixMadeforText-Bold.ttf", {
        family: "MadeforBold",
      });

      const bgImage = await loadImage("src/canvas/pamphlet/pamphlet-bg.png");

      const canvas = createCanvas(bgImage.width, bgImage.height); //935, 1219
      const ctx = canvas.getContext("2d");

      ctx.drawImage(bgImage, 0, 0);

      const thumbnailFetch = await fetch(productMedia[0]);
      const fetchBuffer = await thumbnailFetch.arrayBuffer();
      const thumbnailSharp = await sharp(Buffer.from(fetchBuffer))
        .toFormat("png")
        .toBuffer();
      const thumbnail = await loadImage(thumbnailSharp);
      ctx.drawImage(thumbnail, 270, 350, 400, 400);

      ctx.font = "22px MadeforRegular";
      ctx.fillStyle = "#d8a727";
      let textWidth = ctx.measureText(productName).width;
      const maxWidth = 445;
      const ellipsis = "...";

      if (textWidth > maxWidth) {
        let truncatedText = productName;
        while (textWidth + ctx.measureText(ellipsis).width > maxWidth) {
          truncatedText = truncatedText.slice(0, -1); // Remove one character at a time
          textWidth = ctx.measureText(truncatedText).width;
        }
        truncatedText += ellipsis; // Append the ellipsis
        ctx.fillText(truncatedText, 320, 320); // Draw the truncated text
      } else {
        ctx.fillText(productName, 320, 320); // Draw the text as is
      }

      const ribbon = await loadImage("src/canvas/pamphlet/ribbon.png");
      ctx.drawImage(ribbon, 570, 555, 100, 100);

      ctx.font = "33px MadeforRegular";
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.fillText(percentageDiscount, 623, 617);

      ctx.font = "bold 23px MadeforBold";
      ctx.fillStyle = "#393e41";
      ctx.textAlign = "left";
      let nameWidth = ctx.measureText(productName).width;
      const maxNameWidth = 600;
      if (nameWidth > maxNameWidth) {
        let truncatedText = productName;
        while (nameWidth + ctx.measureText(ellipsis).width > maxNameWidth) {
          truncatedText = truncatedText.slice(0, -1); // Remove one character at a time
          nameWidth = ctx.measureText(truncatedText).width;
        }
        truncatedText += ellipsis; // Append the ellipsis
        ctx.fillText(truncatedText, 170, 864); // Draw the truncated text
      } else {
        ctx.fillText(productName, 170, 864); // Draw the text as is
      }

      const priceX = 170;
      const priceY = 904;
      ctx.font = "27px Calibri";
      ctx.fillStyle = "#808080";
      ctx.textAlign = "left";

      ctx.fillText(pesoFormatter.format(productMainPrice), priceX, priceY);
      const { width } = ctx.measureText(pesoFormatter.format(productMainPrice));
      ctx.fillRect(priceX - 2, priceY - 10, width + 4, 1);

      ctx.font = "33px Calibri";
      ctx.fillStyle = "#de2929";
      ctx.fillText(
        pesoFormatter.format(productRedPrice),
        priceX + width + 10,
        priceY
      );

      const images = [];

      if (productMedia[1]) {
        const Image1 = await fetch(productMedia[1]);
        const fetchBuffer1 = await Image1.arrayBuffer();
        const sharp1 = await sharp(Buffer.from(fetchBuffer1))
          .toFormat("png")
          .toBuffer();
        const img1 = await loadImage(sharp1);
        images.push(img1);
      }

      if (productMedia[2]) {
        const Image2 = await fetch(productMedia[2]);
        const fetchBuffer2 = await Image2.arrayBuffer();
        const sharp2 = await sharp(Buffer.from(fetchBuffer2))
          .toFormat("png")
          .toBuffer();
        const img2 = await loadImage(sharp2);

        images.push(img2);
      }

      if (productMedia[3]) {
        const Image3 = await fetch(productMedia[3]);
        const fetchBuffer3 = await Image3.arrayBuffer();
        const sharp3 = await sharp(Buffer.from(fetchBuffer3))
          .toFormat("png")
          .toBuffer();
        const img3 = await loadImage(sharp3);

        images.push(img3);
      }

      const cornerXValues = [250, 400, 550]; // Adjust the positions as needed
      await createRoundedCornerImage(images, cornerXValues, 680, 140, 20);

      async function createRoundedCornerImage(
        innerImagePaths,
        cornerXValues,
        cornerY,
        cornerSize,
        cornerRadius
      ) {
        const cornerCanvases = [];
        for (let i = 0; i < images.length; i++) {
          const canvas = createCanvas(cornerSize, cornerSize);
          const ctx = canvas.getContext("2d");
          drawRoundedCorner(
            ctx,
            cornerSize,
            cornerSize,
            cornerRadius,
            innerImagePaths[i]
          );
          cornerCanvases.push({ canvas, x: cornerXValues[i] });
        }

        for (const corner of cornerCanvases) {
          ctx.globalCompositeOperation = "source-over";
          ctx.drawImage(corner.canvas, corner.x, cornerY);
        }

        function drawRoundedCorner(ctx, width, height, cornerRadius, image) {
          ctx.beginPath();
          ctx.moveTo(cornerRadius, 0);
          ctx.lineTo(width - cornerRadius, 0);
          ctx.quadraticCurveTo(width, 0, width, cornerRadius);
          ctx.lineTo(width, height - cornerRadius);
          ctx.quadraticCurveTo(width, height, width - cornerRadius, height);
          ctx.lineTo(cornerRadius, height);
          ctx.quadraticCurveTo(0, height, 0, height - cornerRadius);
          ctx.lineTo(0, cornerRadius);
          ctx.quadraticCurveTo(0, 0, cornerRadius, 0);
          ctx.closePath();
          ctx.clip();

          ctx.drawImage(image, 0, 0, width, height);
        }
      }

      const attachment = new AttachmentBuilder(canvas.toBuffer(), {
        name: `${product.slug}.jpeg`,
      });

      return await interaction.editReply({
        content: "Here is your requested pamphlet:",
        files: [attachment],
      });
    } catch (error) {
      console.error(
        "There was a problem with the fetch operation on command: /PAMPHLET:",
        error
      );
      await interaction.editReply({
        content: "An Error has occured while fetching your request.",
      });
    }
  },
};
