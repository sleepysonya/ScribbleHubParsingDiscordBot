const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
} = require("discord.js");
const { MongoClient } = require("mongodb");
const { user, password } = require("../config.json");
const uri = `mongodb+srv://${user}:${password}@cluster0.s0jnsee.mongodb.net/`;


module.exports = {
  data: new SlashCommandBuilder()
    .setName("delete")
    .setDescription("Delete a novel from your list"),
  async execute(interaction) {
    const mongodb = await MongoClient.connect(uri, {
      useNewUrlParser: true,
    });
    const users = mongodb.db("sh-parser").collection("users_novels");
    const novels = await users.find({ users: interaction.user.id }).toArray()
    let novel_list = [];
    const buttons = new ActionRowBuilder().addComponents(
      novels.forEach((novel) => {
            novel_list.push(new ButtonBuilder()
            .setCustomId(novel.novel_id)
            .setLabel(novel.novel_name)
            .setStyle(1)
            )
      })
    );
    buttons.components = novel_list;
    const message = await interaction.reply({
      content: `Choose from your list to delete`,
      ephemeral: true,
      components: [buttons],
    });

    const filter = (i) => i.user.id === interaction.user.id;
    console.log(message)
    const collector = message.createMessageComponentCollector({
        filter,
        time: 15000,
    });

    collector.on("collect", async (i) => {
        await i.deferUpdate();
        await users.updateOne({ novel_id: i.customId }, { $pull: { users: interaction.user.id } });
        await interaction.editReply({
            content: `Novel deleted`,
            ephemeral: true,
            components: [],
        });
    });
},
};
