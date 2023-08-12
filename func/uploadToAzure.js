module.exports = async (message, containerClient) => {
    const websiteUpdate = require("./websiteUpdate.js");
    if (message.partial) await message.fetch()
    const attachments = message.attachments;

    let i = 1;

    console.log(attachments);
    for (const [key, value] of attachments) {
        console.log("Upload");
        const fileType = value.contentType.split("/")[1];
        const blobClient = containerClient.getBlobClient(`${Date.now()}/${message.id}-${i++}.${fileType}`);
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
}
