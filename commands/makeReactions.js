const writeableConfig = require("../writeableConfig.json");
const Discord = require("discord.js");
module.exports = {
    command: {
        name: "emoji",
        description: "Hehehe ich bin ein Emoji",
    },
    run: async (client, interaction, prisma) => {
        interaction.reply("Working on it", {ephemeral: true});
        let allMessages = await prisma.message.findMany();
        let i = 0;

        for (const message of allMessages) {
            //add the reactions
            let discordMessage = await client.channels.cache.get(process.env.DISCORD_CHANNEL_ID).messages.fetch(message.id);
            discordMessage.react(writeableConfig["upvote"]).then(() => {
                discordMessage.react(writeableConfig["downvote"]).then(() => {
                    console.log("Message reacted", i);
                    i = i + 1;
                })
            });
        }




    }
}
