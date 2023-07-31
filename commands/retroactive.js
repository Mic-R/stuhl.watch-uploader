const writeableConfig = require("../writeableConfig.json");
module.exports = {
    command: {
        name: "retroactive",
        description: "Load all messages from the channel and load them into the database",
    },
    run: async (client, interaction, prisma) => {
        const uploadToAzure = require("../func/uploadToAzure.js");
        const Discord = require("discord.js");

        async function getMessages(channel, limit) {

            let messagesColl = new Discord.Collection();
            while (true) {
                const options = {limit: 100};
                if (messagesColl.size > 0) {
                    options.before = messagesColl.lastKey();
                }
                const messages = await channel.messages.fetch(options);
                messagesColl = messagesColl.concat(messages);
                if (messages.size !== 100 || messagesColl.size >= limit) {
                    break;
                }
            }

            return messagesColl;
        }


        getMessages(client.channels.cache.get(process.env.DISCORD_CHANNEL_ID), 500).then((messagesColl) => {
            if (messagesColl.length === 0) {
                interaction.reply("No messages found", {ephemeral: true});
                return;
            }

            console.log(messagesColl.length);
            console.log("--- RETROACTIVE UPLOAD ---");
            messagesColl.forEach(async (message) => {
                console.log(message.id);

                if (message.attachments.length === 0) return;
                let writeableConfig = require("../writeableConfig.json");
                let search = await prisma.message.findMany({
                    where: {
                        id: message.id
                    }
                });
                if (search.length === 0) {
                    console.log("Message not found in database");
                    console.log("Creating " + message.id + " in database")
                    await prisma.message.create({
                        data: {
                            id: message.id
                        }
                    }).then(() => {
                        message.react(writeableConfig["upvote"]).then(() => {
                            message.react(writeableConfig["downvote"]).then(() => {
                                console.log("Message created in database");
                            })
                        })
                    });
                }
            });


            console.log("--- RETROACTIVE UPLOAD COMPLETE ---");
        });

        interaction.reply("Working on it", {ephemeral: true});

    }
}
