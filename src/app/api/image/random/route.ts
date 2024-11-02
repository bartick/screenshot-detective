export const GET = async (req: Request) => {
    const requestUrl = new URL(req.url);
    const imageWidth = requestUrl.searchParams.get("width");
    const imageHeight = requestUrl.searchParams.get("height");

    if (!imageWidth || !imageHeight) {
        return new Response("Missing 'width' or 'height' query parameter", { status: 400 });
    }
    if (isNaN(parseInt(imageWidth)) || isNaN(parseInt(imageHeight))) {
        return new Response("Invalid 'width' or 'height' query parameter", { status: 400 });
    }
    
    const minSize = Math.min(parseInt(imageWidth), parseInt(imageHeight));
    const cropSize = Math.trunc(minSize * 0.2);

    const maxX = parseInt(imageWidth) - cropSize;
    const maxY = parseInt(imageHeight) - cropSize;
    const randomX = Math.floor(Math.random() * maxX);
    const randomY = Math.floor(Math.random() * maxY);

    return new Response(JSON.stringify({ randomX, randomY }), {"headers": {"content-type": "application/json"}});
};