const fs = require("node:fs");
const path = require("node:path");
const { Client, Collection, GatewayIntentBits } = require("discord.js");
const { token } = require("./config.json");
const { deployCommands } = require("./deploy-commands.js");
const schedule = require("node-schedule");
const { fetching_book } = require("./functions/chap_parser");
const { MongoClient } = require("mongodb");
const { user, password } = require("./config.json");

const uri = `mongodb+srv://${user}:${password}@cluster0.s0jnsee.mongodb.net/`;
const mongodb = MongoClient.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  socketTimeoutMS: 30000,
  connectTimeoutMS: 30000,
  maxPoolSize: 10,
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.DirectMessageReactions,
  ],
});

const u = schedule.scheduleJob("0 * * * * *", async () => {
  const db = await mongodb;
  const novels = db.db("sh-parser").collection("users_novels");
  novels.find({}).forEach(async (novel) => {
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
    const exist = await novels.findOne({
      novel_id,
      "chapters.chapter_id": chapter_id,
    });
    if (exist === null) {
      await novels.updateOne(
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
      );
      const users_to_notify = novel.users;
      const channels_to_notify = novel.channels;
      if (users_to_notify === null || channels_to_notify === null) {
        
        return;
      }
      if (users_to_notify !== null && channels_to_notify !== null) {
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
      if (channels_to_notify !== null && channels_to_notify.length > 0) {
      channels_to_notify.forEach(async (channel) => {
        const channel_to_notify = await client.channels.fetch(channel);
        console.log(`Notifying ${channel_to_notify.name}`);
        channel_to_notify
          .send(
            `@here New chapter of ${novel_name} has been released: ${chapter_link}`
          )
          .catch(console.error);
      });
    }
    else {
      console.log("No new chapter");

    }
    }
  });
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
  console.log(interaction.author + " used /" + interaction.commandName);
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
