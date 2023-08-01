const writeableConfig = require("../writeableConfig.json");
const Discord = require("discord.js");
module.exports = {
    command: {
        name: "eval",
        description: "Evaluate",
    },
    run: async (client, interaction, prisma) => {
        interaction.reply("Working on it", {ephemeral: true});
        let allMessages = await prisma.message.findMany();
        let i = 0;

        for (const message of allMessages) {
            //add the reactions
            let discordMessage = await client.channels.cache.get(process.env.DISCORD_CHANNEL_ID).messages.fetch(message.id);
            await discordMessage.fetch();
            let upvotes = Array.from(discordMessage.reactions.cache.values()).filter((a) => a.emoji.name === writeableConfig["upvoteName"])[0].count;
            console.log(upvotes)
            let downvotes = Array.from(discordMessage.reactions.cache.values()).filter((a) => a.emoji.name === writeableConfig["downvoteName"])[0].count;

            prisma.message.findFirst({
                where: {
                    id: message.id
                },
                select: {
                    upvotes: true,
                    downvotes: true
                }
            }).then((result) => {
                prisma.message.update({
                    where: {
                        id: message.id
                    },
                    data: {
                        upvotes: upvotes,
                        downvotes: downvotes
                    }
                }).then(() => {
                    console.log("Message updated", i);
                    i = i + 1;
                    console.log(result.upvotes + " -> " + upvotes);
                });
            });
        }

    }
}
