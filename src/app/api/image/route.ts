import sharp from "sharp";
import axios from "axios";

async function getImage(url: string) {
    const response = await axios.get(url, {
        responseType: "arraybuffer",
    });
    return response.data;
}

async function cropImage(image: Buffer, imageWidth: number, imageHeight: number, randomX: number, randomY: number) {

    const minSize = Math.min(imageWidth, imageHeight);

    const cropSize = Math.trunc(minSize*0.2);

    return await sharp(image)
        .extract({ left: randomX, top: randomY, width: cropSize, height: cropSize })
        .resize(1024, 1024)
        .toBuffer();
}

export const GET = async (req: Request) => {
    try {
        const requestUrl = new URL(req.url);
        const url = requestUrl.searchParams.get("url");
        const height = requestUrl.searchParams.get("height");
        const width = requestUrl.searchParams.get("width");
        const randomX = requestUrl.searchParams.get("randomx");
        const randomY = requestUrl.searchParams.get("randomy");
        if (!url) {
            return new Response("Missing 'url' query parameter", {
                status: 400,
            });
        }
        if (!height) {
            return new Response("Missing 'height' query parameter", {
                status: 400,
            });
        }
        if (!width) {
            return new Response("Missing 'width' query parameter", {
                status: 400,
            });
        }
        if (!randomX) {
            return new Response("Missing 'randomx' query parameter", {
                status: 400,
            });
        }
        if (!randomY) {
            return new Response("Missing 'randomy' query parameter", {
                status: 400,
            });
        }

        const image = await getImage(url);
        const croppedImage = await cropImage(image, parseInt(height), parseInt(width), parseInt(randomX), parseInt(randomY));

        return new Response(croppedImage, {
            headers: {
                "Content-Type": "image/jpeg",
            },
        });
    } catch (err) {
        console.log(err);
        return new Response("An unknown error occurred", {
            status: 400,
        });
    }
};