module.exports = async (containerClient) => {
    require("dotenv").config();

    if (!process.env.AZURE_BLOB_DOMAIN) {
        console.log("AZURE_BLOB_DOMAIN must be set in .env file");
    }

    const blobClient = containerClient.getBlobClient(`list.json`);
    const blockBlobClient = blobClient.getBlockBlobClient();

    const list = {
        "list": []
    }

    for await (const blob of containerClient.listBlobsFlat({
        includeTags: false,
        includeCopy: false,
        includeDeleted: false,
        includeVersions: false,
        includeMetadata: false,
        includeDeletedWithVersions: false,
        includeSnapshots: false
    })) {
        if (!blob.name.includes("list.json")) {
            list.list.push(`${process.env.AZURE_BLOB_DOMAIN}${process.env.AZURE_BLOB_CONTAINER}/${blob.name}`);
        }
    }

    await blockBlobClient.upload(JSON.stringify(list), JSON.stringify(list).length).then(() => {
        console.log("List updated successfully");
    });

}
