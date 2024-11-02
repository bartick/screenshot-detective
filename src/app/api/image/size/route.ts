import axios from "axios";
import sharp from "sharp";

async function getSize(image: Buffer) {
    return await sharp(image).metadata();
}

async function getImage(url: string) {
    const response = await axios.get(url, {
        responseType: "arraybuffer",
    });
    return response.data;
}

export const GET = async (req: Request) => {
    const requestUrl = new URL(req.url);
    const url = requestUrl.searchParams.get("url");
    if (!url) {
        return new Response("Missing 'url' query parameter", {
            status: 400,
        });
    }

    const image = await getImage(url);
    const imageMetadata = await getSize(image);
    if (!imageMetadata || !imageMetadata.width || !imageMetadata.height) {
        return new Response("Invalid image", {
            status: 400,
        });
    }

    return new Response(JSON.stringify(imageMetadata), {
        headers: {
            "content-type": "application/json",
        },
    });
};