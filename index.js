const { BlobServiceClient } = require("@azure/storage-blob");
require("dotenv").config();
const { Client, GatewayIntentBits, Partials } = require("discord.js");
const websiteUpdate = require("./func/websiteUpdate");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const uploadToAzure = require("./func/uploadToAzure");
const fs = require("fs");

if (!process.env.AZURE_STORAGE_CONNECTION_STRING) {
    throw new Error("AZURE_BLOB_SAS_URL must be set in .env file");
}
if (!process.env.AZURE_BLOB_CONTAINER) {
    throw new Error("AZURE_BLOB_CONTAINER must be set in .env file");
}

if (!process.env.DISCORD_TOKEN) {
    throw new Error("DISCORD_TOKEN must be set in .env file");
}

const blobServiceClient = BlobServiceClient.fromConnectionString(
    process.env.AZURE_STORAGE_CONNECTION_STRING
);

const DiscordClient = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessageReactions], partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.GuildMember], });

async function main() {
    try {
        console.log("--- Open Source Libraries ---");
        console.log("Azure Blob storage v12 - JavaScript SDK");
        console.log("Discord.js v12 - JavaScript SDK");
        console.log("uuid v8 - JavaScript SDK");
        console.log("dotenv v8 - JavaScript SDK");
        console.log("----------------------------");

        const containerClient = blobServiceClient.getContainerClient(process.env.AZURE_BLOB_CONTAINER);
        const commands = [];


        DiscordClient.on("ready", () => {
            console.log("Bot is ready!");

            //register commands from ./commands folder
            const commandFiles = fs
                .readdirSync("./commands")
                .filter((file) => file.endsWith(".js"));
            for (const file of commandFiles) {
                let data = require(`./commands/${file}`);
                commands.push(data);
                DiscordClient.application.commands
                    .create(data.command)
                    .then(() =>
                        console.log(
                            new Date().toLocaleString(),
                            `Created command /${data.command.name}`
                        )
                    )
                    .catch(console.error);
            }
        });

        DiscordClient.on("interactionCreate", async (interaction) => {
            if (interaction.isCommand()) {
                const command = commands.find(
                    (command) => command.command.name === interaction.commandName
                );
                if (!command) return;
                try {
                    await command.run(DiscordClient, interaction, prisma);
                } catch (error) {
                    console.error(error);
                    await interaction.reply({
                        content: "There was an error while executing this command!",
                        ephemeral: true,
                    });
                }
            }
        });

        DiscordClient.on("messageCreate", async (message) => {
            if (message.partial) await message.fetch();
            if (message.author.bot) return;
            if (message.channelId !== process.env.DISCORD_CHANNEL_ID) return;
            if (message.attachments.size === 0) return;
            await prisma.message.create({
                data: {
                    id: message.id
                }
            });

            let writeableConfig = require("./writeableConfig.json");
            await message.react(writeableConfig["upvote"]);
            await message.react(writeableConfig["downvote"]);

        });

        DiscordClient.on("messageReactionAdd", async (reaction, user) => {
            let writeableConfig = require("./writeableConfig.json");
            if ((reaction.partial) || (user.partial)) {
                await reaction.fetch();
                await user.fetch();
            }

            if (reaction.message.channelId !== process.env.DISCORD_CHANNEL_ID) return;

            if (user.bot) return;

            let message = await prisma.message.findFirst({
                where: {
                    id: reaction.message.id
                }
            });

            if (message.uploaded) return;

            let search = await prisma.vote.findFirst({
                where: {
                    messageId: reaction.message.id,
                    UserId: user.id,
                    upvote: (reaction.emoji.name === writeableConfig["upvoteName"])
                }
            });


            if (!search) {
                console.log(reaction.emoji.name, reaction.message.id);
                let writeableConfig = require("./writeableConfig.json");
                prisma.message.update(
                    {
                        where: {
                            id: reaction.message.id
                        },
                        data: {
                            upvotes: message.upvotes + (reaction.emoji.name === writeableConfig["upvoteName"] ? 1 : 0),
                            downvotes: message.downvotes + (reaction.emoji.name === writeableConfig["downvoteName"] ? 1 : 0)
                        },
                        select: {
                            upvotes: true,
                            downvotes: true,
                            uploaded: true
                        }
                    }
                ).then(async (msg) => {
                    if (msg.upvotes - msg.downvotes >= writeableConfig["threshold"] && msg.uploaded === false) {
                        await reaction.message.react("✅");

                        let messageAtt = await DiscordClient.channels.cache.get(process.env.DISCORD_CHANNEL_ID).messages.cache.get(reaction.message.id).fetch();
                        await uploadToAzure(messageAtt, containerClient);
                    }
                });
                await prisma.vote.create({
                    data: {
                        messageId: reaction.message.id,
                        UserId: user.id,
                        upvote: (reaction.emoji.name === writeableConfig["upvoteName"])
                    }
                });
            }
        });

        DiscordClient.on("messageDelete", async (message) => {
            if (message.channelId !== process.env.DISCORD_CHANNEL_ID) return;
            let search = await prisma.message.findFirst({
                where: {
                    id: message.id
                }
            });
            if (!search) return;

            prisma.message.delete({
                where: {
                    id: message.id
                },
                select: {
                    uploaded: true
                }
            }).then(async (msg) => {
                if (msg.uploaded === true) {
                    const tagValue = message.id.toString();

                    for await (const blob of blobServiceClient.findBlobsByTags(`messageid='${tagValue}'`)) {
                        const blobClient = containerClient.getBlobClient(blob.name);
                        const deleteBlobResponse = await blobClient.delete();
                        console.log(`Deleted block blob successfully`, deleteBlobResponse.requestId);
                    }

                    await websiteUpdate(containerClient);
                }
            });
        });

        await DiscordClient.login(process.env.DISCORD_TOKEN);
    } catch (err) {
        console.error(`Error: ${err.message}`);
    }
}

main()
    .catch((ex) => console.log(ex.message));
