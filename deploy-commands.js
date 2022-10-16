const { REST, Routes } = require("discord.js");
const { clientId, token } = require("./config.json");
const fs = require("node:fs");
const path = require("node:path");

const commands = [];

const commandPath = path.join(__dirname, "commands");
const commandFiles = fs
  .readdirSync(commandPath)
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = path.join(commandPath, file);
  const command = require(filePath);
  commands.push(command.data.toJSON());
}

const rest = new REST({ version: "10" }).setToken(token);
async function deployCommands() {
 
    try {
      rest
        .put(Routes.applicationCommands(clientId), {
          body: commands,
        })
        .catch(console.error);
    } catch (error) {
      console.error(error);
    }
}

module.exports = { deployCommands };
