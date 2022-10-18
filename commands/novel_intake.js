const { SlashCommandBuilder } = require("discord.js");
const { MongoClient } = require("mongodb");
const { user, password } = require("../config.json");

const uri = `mongodb+srv://${user}:${password}@cluster0.s0jnsee.mongodb.net/`;
const regex =
  /[(http(s)?):\/\/(www\.)?a-zA-Z0-9@:%._\+~#=]{2,256}(scribblehub)\.(com\/series\/[0-9]*\/)([-a-zA-Z0-9@:%_\+.~#?&//=]*)/;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("add")
    .setDescription("Get the novel you want to follow")
    .addStringOption((option) =>
      option
        .setName("link")
        .setDescription("Getting the link of the novel you want to follow")
        .setRequired(true)
    ),
  async execute(interaction) {
    const client = await MongoClient.connect(uri, {
      useNewUrlParser: true,
    });
    const users = client.db("sh-parser").collection("users_novels");
    const link = interaction.options.getString("link");
    // regex to check if the link is valid
    if (link.match(regex) === null) {
      await interaction.reply({
        content: "Please enter a valid link",
        ephemeral: true,
      }).then(() => client.close());
      return;
    }
    const novel_id = link.split("scribblehub.com/series/")[1].split("/")[0];
    const novel_name = link
      .split("scribblehub.com/series/")[1]
      .split("/")[1]
      .replace(/-/g, " ");
    await interaction.deferReply({
      content: `Adding ${novel_name} to your list`,
      ephemeral: true,

    });
    // We are doing all operations here
    const exist = await users.findOne({ novel_id });
    // If the novel is already in the database
    // Reminder: Add more checking conditons
    if (exist === null) {
      console.log("Novel not found, adding to database");
      await users.insertOne({ link, novel_name, novel_id, users: [interaction.user.id] });
      await interaction.editReply(
        {
          content: `Novel [${novel_name}](${link}) added to your list`,
          ephemeral: true,
        }
      ).then(() => (client.close())).then(() => console.log(`Novel ${novel_name} added`));
    } else {
      if (exist.users.includes(interaction.user.id)) {
        await interaction.editReply(
          {
            content: `You are already following [${novel_name}](${link})`,
            ephemeral: true,
          }
        ).then(() => (client.close())).then(() => console.log(`Novel ${novel_name} already in list`));
        return;
      }
      console.log("Novel found, updating database");
      await users.updateOne(
        { novel_id },
        { $push: { users: interaction.user.id } }
      ).then(() => interaction.editReply(
        {
          content: `Novel [${novel_name}](${link}) added to your list`,
          ephemeral: true,
        }
      ))
      .then(() => (client.close())).then( () => console.log(`Novel ${novel_name} added to user ${interaction.user.id}`));
    }
  },
};
