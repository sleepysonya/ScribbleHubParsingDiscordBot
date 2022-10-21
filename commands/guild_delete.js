const {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
  } = require("discord.js");
  const { user, password } = require("../config.json");
  const { MongoClient } = require("mongodb");
  const uri = `mongodb+srv://${user}:${password}@cluster0.s0jnsee.mongodb.net/`;
  const regex =
  /[(http(s)?):\/\/(www\.)?a-zA-Z0-9@:%._\+~#=]{2,256}(scribblehub)\.(com\/series\/[0-9]*\/)([-a-zA-Z0-9@:%_\+.~#?&//=]*)/;
  
  module.exports = {
    data: new SlashCommandBuilder()
      .setName("delchannel")
      .setDescription("Delete a novel from your list")
      .addStringOption((option) =>
      option
        .setName("link")
        .setDescription("Getting the link of the novel you want to delete")
        .setRequired(true)
    ),
    async execute(interaction) {
        console.log(interaction);
      const mongodb = await MongoClient.connect(uri, {
        useNewUrlParser: true,
      });
      const users = await mongodb.db("sh-parser").collection("users_novels");
        const link = interaction.options.getString("link");
        if (link.match(regex) === null) {
            await interaction.reply({
                content: "Please enter a valid link",
                ephemeral: true,
            }).then(() => mongodb.close());
            return;
            }
        const novel_id = link.split("scribblehub.com/series/")[1].split("/")[0];
        const novel_name = link
        .split("scribblehub.com/series/")[1]
        .split("/")[1]
        .replace(/-/g, " ");
        const exist = await users.findOne({ novel_id });
        if (exist === null) {
            await interaction.reply({
                content: `Novel [${novel_name}](${link}) is not in your list`,
                ephemeral: true,
            }).then(() => mongodb.close());
            return;
        }
        if (!exist.channels.includes(interaction.channel.id)) {
            await interaction.reply({
                content: `You are not following [${novel_name}](${link})`,
                ephemeral: true,
            }).then(() => mongodb.close());
            return;
        }
        await users.updateOne({ novel_id }, { $pull: { channel: interaction.channel.id } });
        await interaction.reply({
            content: `Novel [${novel_name}](${link}) deleted`,
            ephemeral: true,
        }).then(() => mongodb.close());
  },
  };
  