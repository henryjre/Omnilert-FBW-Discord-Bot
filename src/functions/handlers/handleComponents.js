const { readdirSync } = require("fs");

module.exports = (client) => {
  client.handleComponents = async () => {
    const { buttons, selectMenus, modals } = client;

    const buttonComponentsFolder = readdirSync(`./src/components/button`);
    for (const folder of buttonComponentsFolder) {
      const componentFiles = readdirSync(
        `./src/components/button/${folder}`
      ).filter((file) => file.endsWith(".js"));

      for (const file of componentFiles) {
        const button = require(`../../components/button/${folder}/${file}`);
        buttons.set(button.data.name, button);
      }
    }

    const menuComponentsFolder = readdirSync(`./src/components/menu`);
    for (const folder of menuComponentsFolder) {
      const componentFiles = readdirSync(
        `./src/components/menu/${folder}`
      ).filter((file) => file.endsWith(".js"));

      for (const file of componentFiles) {
        const menu = require(`../../components/menu/${folder}/${file}`);
        selectMenus.set(menu.data.name, menu);
      }
    }

    const modalComponentsFolder = readdirSync(`./src/components/modal`);
    for (const folder of modalComponentsFolder) {
      const componentFiles = readdirSync(
        `./src/components/modal/${folder}`
      ).filter((file) => file.endsWith(".js"));

      for (const file of componentFiles) {
        const modal = require(`../../components/modal/${folder}/${file}`);
        modals.set(modal.data.name, modal);
      }
    }
  };
};
