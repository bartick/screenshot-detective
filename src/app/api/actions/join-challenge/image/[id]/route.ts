import prisma from "@/lib/prisma";
import axios from "axios";
import sharp from "sharp";

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


export const GET = async (_req: Request, {params: {id}}: {
    params: {
        id: string;
    };
}) => {

    const gameToPay = await prisma.challenge.findUnique({
        select: {
            url: true,
            imageHeight: true,
            imageWidth: true,
            randomX: true,
            randomY: true,
        },
        where: {
            id: parseInt(id),
        }
    });

    const image = await getImage(gameToPay?.url as string);
    const croppedImage = await cropImage(image, gameToPay?.imageHeight as number, gameToPay?.imageWidth as number, gameToPay?.randomX as number, gameToPay?.randomY as number);

    return new Response(croppedImage, {
        headers: {
            "Content-Type": "image/jpeg",
        },
    });
}

export const OPTIONS = GET;