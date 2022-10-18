const fs = require("node:fs");
const path = require("node:path");
const { Client, Collection, GatewayIntentBits } = require("discord.js");
const { token } = require("./config.json");
const { deployCommands } = require("./deploy-commands.js");
const schedule = require("node-schedule");
const { fetching_book } = require("./functions/chap_parser");
const { MongoClient} = require("mongodb");
const { user, password } = require("./config.json");

const uri = `mongodb+srv://${user}:${password}@cluster0.s0jnsee.mongodb.net/`;

const u = schedule.scheduleJob("15 * * * * *", async () => {
  const client = await MongoClient.connect(
    uri,
    { useNewUrlParser: true, useUnifiedTopology: true, socketTimeoutMS: 30000, connectTimeoutMS: 30000, maxPoolSize: 10},
  )
    const db = await client.db("sh-parser");
    const users = await db.collection("users_novels");
    users.find({}).forEach(async (novel) => {
      const link = novel.link;
      const novel_id = novel.novel_id;
      const novel_name = link
        .split("scribblehub.com/series/")[1]
        .split("/")[1]
        .replace(/-/g, " ");
      const novel_chap = await fetching_book(link);
      const chapter_name = novel_chap.childNodes[0].rawText;
      const chapter_link = novel_chap.childNodes[0].attributes.href;
      const chapter_date = novel_chap.childNodes[1].rawText;
      const chapter_id = chapter_link.split("chapter/")[1].split("/")[0];
      const exist = await users.findOne({
        novel_id,
        "chapters.chapter_id": chapter_id,
      });
      if (exist === null) {
        console.log("New chapter found");
        await users
          .updateOne(
            { novel_id },
            {
              $push: {
                chapters: {
                  chapter_name,
                  chapter_link,
                  chapter_date,
                  chapter_id,
                },
              },
            }
          )
        const users_to_notify = novel.users;
        users_to_notify.forEach(async (user) => {
          const user_to_notify = await client.users.fetch(user);
          console.log(`Notifying ${user_to_notify.username}`);
          user_to_notify
            .send(
              `New chapter of ${novel_name} has been released: ${chapter_link}`
            )
            .catch(console.error);
        });
      }
      else {
        console.log("No new chapter found");
      }
    })
  });

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.DirectMessageReactions,
  ],
});

client.commands = new Collection();
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  client.commands.set(command.data.name, command);
}

client.once("ready", () => {
  u.on;
  deployCommands();
  console.log("Ready!");
  client.user.setStatus("online");
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  interaction.author = interaction.user;
  console.log(interaction.author + " used " + interaction.commandName);
  const command = client.commands.get(interaction.commandName);

  if (!command) return;
  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    await interaction.reply({
      content: "There was an error while executing this command!",
      ephemeral: true,
    });
  }
});

client.login(token).catch(console.error);

client.on("ready", () => {
  client.user.setStatus("online");
});
