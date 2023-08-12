module.exports = async (message, containerClient) => {
    const websiteUpdate = require("./websiteUpdate.js");
    if (message.partial) await message.fetch()
    const attachment = message.content;
    
    console.log("Upload");
    const fileType = attachment.substring(attachment.lastIndexOf("."));
    const blobClient = containerClient.getBlobClient(`${Date.now()}/${message.id}${fileType}`);
    const blockBlobClient = blobClient.getBlockBlobClient();
    const response = await fetch(attachment);
    const buffer = await response.arrayBuffer();
    const uploadBlobResponse = await blockBlobClient.upload(buffer, buffer.byteLength, {
        tags: {
            'messageid': message.id.toString()
        }
    });
    console.log(`Upload block blob successfully`, uploadBlobResponse.requestId, key);

    await websiteUpdate(containerClient);
}
