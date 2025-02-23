const chalk = require("chalk");
const fs = require("fs").promises;
const path = require("path");

async function getJsonFile(fileName) {
  const filePath = path.join(__dirname, `../tempDatabase/${fileName}.json`);

  try {
    const data = await fs.readFile(filePath, "utf-8");
    const jsonObject = JSON.parse(data);
    console.log(chalk.green(`🟢 ${fileName}.json data retrieved successfully`));
    return jsonObject;
  } catch (error) {
    console.error(
      chalk.red(`🔴 Error in retrieving data from ${fileName}.json`),
      error
    );
    return null;
  }
}

async function clearJsonFile(fileName) {
  const filePath = path.join(__dirname, `../tempDatabase/${fileName}.json`);

  try {
    await fs.truncate(filePath, 0); // Truncate the file to zero bytes
    console.log(chalk.green(`🟢 ${fileName}.json data was cleared.`));
  } catch (error) {
    console.error(chalk.red(`🔴 Error in clearing ${fileName}.json`), error);
  }
}

async function storeJsonFile(fileName, jsonObject) {
  const filePath = path.join(__dirname, `../tempDatabase/${fileName}.json`);

  try {
    // Read existing data
    const existingData = await fs.readFile(filePath, "utf-8");

    // Parse existing data (or initialize as an empty array if the file is empty)
    const existingArray = existingData ? JSON.parse(existingData) : [];

    // Append the new JSON object
    existingArray.push(jsonObject);

    // Write back to the file
    await fs.writeFile(filePath, JSON.stringify(existingArray));
    console.log(chalk.green(`🟢 New data on ${fileName}.json:`));
    console.log(chalk.blue(JSON.stringify(jsonObject)));
  } catch (error) {
    console.error(chalk.red(`🔴 Error in storing to ${fileName}.json`), error);
    console.log(chalk.yellow(JSON.stringify(jsonObject)));
  }
}

async function updateJsonFile(fileName, updatedData) {
  const filePath = path.join(__dirname, `../tempDatabase/${fileName}.json`);
  try {
    await fs.writeFile(filePath, JSON.stringify(updatedData));
    console.log(chalk.green(`🟢 ${fileName}.json updated successfully.`));
  } catch (error) {
    console.error(chalk.red(`🔴 Error in updating ${fileName}.json`), error);
  }
}

module.exports = { getJsonFile, storeJsonFile, updateJsonFile, clearJsonFile };
