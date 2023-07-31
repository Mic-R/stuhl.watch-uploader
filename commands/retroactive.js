const writeableConfig = require("../writeableConfig.json");
module.exports = {
    command: {
        name: "retroactive",
        description: "Load all messages from the channel and load them into the database",
    },
    run: async (client, interaction, prisma) => {
        const uploadToAzure = require("../func/uploadToAzure.js");

        client.channels.cache.get(process.env.DISCORD_CHANNEL_ID).messages.fetch().then((messagesColl) => {
            if(messagesColl.size === 0) {
                interaction.reply("No messages found", {ephemeral: true});
                return;
            }

            console.log(messagesColl.size);
            console.log("--- RETROACTIVE UPLOAD ---");
            messagesColl.forEach(async (message) => {
                console.log(message.id);
                let search = await prisma.message.findFirst({ where: { id: message.id } });
                if(search) return;

                if(message.attachments.size === 0) return;
                let writeableConfig = require("../writeableConfig.json");
                await message.react(writeableConfig["upvote"]);
                await message.react(writeableConfig["downvote"]);
                await prisma.message.create({
                    data: {
                        id: message.id
                    }
                });
            });

            interaction.reply("Retroactive upload complete", {ephemeral: true});

            console.log("--- RETROACTIVE UPLOAD COMPLETE ---");
        });
    }
}
