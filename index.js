const {BlobServiceClient} = require("@azure/storage-blob");
require("dotenv").config();
const {Client, GatewayIntentBits} = require("discord.js");
const websiteUpdate = require("./websiteUpdate");

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

const DiscordClient = new Client({intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]});

async function main() {
    try {
        console.log("--- Open Source Libraries ---");
        console.log("Azure Blob storage v12 - JavaScript SDK");
        console.log("Discord.js v12 - JavaScript SDK");
        console.log("uuid v8 - JavaScript SDK");
        console.log("dotenv v8 - JavaScript SDK");
        console.log("----------------------------");

        const containerClient = blobServiceClient.getContainerClient(process.env.AZURE_BLOB_CONTAINER);

        DiscordClient.on("ready", () => {
            console.log("Bot is ready!");
        });

        DiscordClient.on("messageCreate", async (message) => {
            if (message.channelId !== process.env.DISCORD_CHANNEL_ID || message.attachments.size === 0 || message.author.bot) {
                return;
            }

            const attachments = message.attachments;
            const folderID = message.author.id;

            let i = 1;
            for (const [key, value] of attachments) {
                if (!value.contentType.startsWith("image")) {
                    return;
                }

                const fileType = value.contentType.split("/")[1];
                const blobClient = containerClient.getBlobClient(`${folderID}/${message.id}-${i++}.${fileType}`);
                const blockBlobClient = blobClient.getBlockBlobClient();
                const response = await fetch(value.url);
                const buffer = await response.arrayBuffer();
                const uploadBlobResponse = await blockBlobClient.upload(buffer, buffer.byteLength, {
                    tags: {
                        'messageid': message.id.toString()
                    }
                });
                console.log(`Upload block blob successfully`, uploadBlobResponse.requestId, key);
            }

            await websiteUpdate(containerClient);
            await message.react("✅");
        });

        DiscordClient.on("messageDelete", async (message) => {
            const tagValue = message.id.toString();
            for await (const blob of blobServiceClient.findBlobsByTags(`messageid='${tagValue}'`)) {
                const blobClient = containerClient.getBlobClient(blob.name);
                const deleteBlobResponse = await blobClient.delete();
                console.log(`Deleted block blob successfully`, deleteBlobResponse.requestId);
            }

            await websiteUpdate(containerClient);
        });

        await DiscordClient.login(process.env.DISCORD_TOKEN);
    } catch (err) {
        console.error(`Error: ${err.message}`);
    }
}

main()
    .catch((ex) => console.log(ex.message));
