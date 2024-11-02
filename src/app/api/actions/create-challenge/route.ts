import {
  ActionPostResponse,
  createPostResponse,
  ActionGetResponse,
  createActionHeaders,
  ActionError,
  ACTIONS_CORS_HEADERS,
  NextActionPostRequest,
  MEMO_PROGRAM_ID,
} from "@solana/actions";
import * as web3 from "@solana/web3.js";
import { PublicKey } from "@solana/web3.js";

import {
  VERIFIED_CURRENCY,
} from "@/common/types";
import { getRequestParam } from "@/common/helper/getParams";
import logger from "@/common/logger";
import sharp from "sharp";

// create the standard headers for this route (including CORS)
const headers = createActionHeaders();

export const GET = async (req: Request) => {
  try {
    const requestUrl = new URL(req.url);

    const baseHref = new URL(
      `/api/actions/create-challenge?`,
      requestUrl.origin,
    ).toString();

    const payload: ActionGetResponse = {
      title: "Screenshot Detective",
      icon: `${new URL('fight.jpg', new URL(req.url).origin).toString()}`,
      description: "Enter a image url and app will create a cropped version of that image. The challenger will have to guess the original image.",
      label: 'Create Challenge',
      links: {
        actions: [
          {
            label: "Enter Image",
            href: `${baseHref}&href={href}&answer={answer}&amount={amount}&token={token}`, // this href will have a text input
            type: 'message',
            parameters: [
              {
                name: "href",
                type: 'url',
                label: "Enter the image URL",
                required: true,
              },
              {
                name: 'answer',
                type: 'text',
                label: 'Enter the answer',
              },
              {
                name: 'token',
                label: 'Choose a token to wager',
                type: 'select',
                required: true,
                options:
                  Object.keys(VERIFIED_CURRENCY).map((key) => {
                    return {
                      label: key,
                      value: key,
                    };
                  }),
              },
              {
                name: "amount",
                label: "Amount of token to wager",
                required: true,
                type: 'number',
              },
            ]
          },
        ],
      },
    };

    return Response.json(payload, {
      headers: ACTIONS_CORS_HEADERS,
    });
  } catch (err) {
    logger.error(`${err}`);
    let message = "An unknown error occurred";
    if (typeof err == "string") message = err;
    return new Response(message, {
      status: 400,
      headers: ACTIONS_CORS_HEADERS,
    });
  }
};

// DO NOT FORGET TO INCLUDE THE `OPTIONS` HTTP METHOD
// THIS WILL ENSURE CORS WORKS FOR BLINKS
export const OPTIONS = async () => Response.json(null, { headers });

export const POST = async (req: Request) => {
  try {
    const requestUrl = new URL(req.url);
    const href = getRequestParam<string>(requestUrl, "href", true);
    const answer = getRequestParam<string>(requestUrl, "answer", true);
    const amount = getRequestParam<number>(requestUrl, "amount", true);
    const token = getRequestParam<VERIFIED_CURRENCY>(requestUrl, "token", true);
    let nextStep = getRequestParam<number>(requestUrl, "nextstep", false);
    
    let imageHeight = getRequestParam<number>(requestUrl, "imageHeight", false);
    let imageWidth = getRequestParam<number>(requestUrl, "imageWidth", false);

    if (!imageHeight || !imageWidth) {
      const imageResponse = await fetch(`${requestUrl.origin}/api/image/size?url=${href}`);
      const imageMetadata = await imageResponse.json() as sharp.Metadata;
      if (!imageMetadata || !imageMetadata.width || !imageMetadata.height) {
        throw "Invalid image";
      }
      imageHeight = imageMetadata.height;
      imageWidth = imageMetadata.width;
    }

    const cropResponse = await fetch(`${requestUrl.origin}/api/image/random?width=${imageWidth}&height=${imageHeight}`);
    const cropData = await cropResponse.json();
    const randomX = cropData.randomX;
    const randomY = cropData.randomY;

    if (!nextStep) {
      nextStep = 0;
    }

    const body: NextActionPostRequest = await req.json();

    const connection = new web3.Connection(
      process.env.SOLANA_RPC! || web3.clusterApiUrl("devnet"),
    );

    let account: PublicKey;
    try {
      account = new PublicKey(body.account);
    } catch (err) {
      throw 'Invalid "account" provided';
    }

    const memoMessage = "Create the toughest challenge";

    const transaction = new web3.Transaction()
      .add(
        web3.ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: 0,
        }),
        new web3.TransactionInstruction({
          programId: new PublicKey(MEMO_PROGRAM_ID),
          data: Buffer.from(memoMessage, "utf8"),
          keys: [],
        }),
      );

    transaction.feePayer = account;

    transaction.recentBlockhash = (
      await connection.getLatestBlockhash()
    ).blockhash;

    let payload: ActionPostResponse = await createPostResponse({
      fields: {
        transaction,
        type: 'transaction',
        message: "Transaction created",
        links: {
          next: {
            action: {
              icon: `${requestUrl.origin}/api/image?url=${href}&height=${imageHeight}&width=${imageWidth}&randomx=${randomX}&randomy=${randomY}`,
              title: "Screenshot Detective",
              description: "Enter a image url and app will create a cropped version of that image. The challenger will have to guess the original image.",
              label: "Create Challenge",
              type: 'action',
              links: {
                actions: [
                  {
                    label: "Create Challange",
                    href: `/api/actions/create-challenge/next-action?href=${href}&answer=${answer}&amount=${amount}&token=${token}&imageHeight=${imageHeight}&imageWidth=${imageWidth}&randomX=${randomX}&randomY=${randomY}`,
                    type: 'post',
                  },
                  {
                    label: "Retry Crop",
                    href: `/api/actions/create-challenge?href=${href}&answer=${answer}&amount=${amount}&token=${token}&nextstep=${nextStep + 1}?imageHeight=${imageHeight}&imageWidth=${imageWidth}`,
                    type: 'post',
                  }
                ]
              }
            },
            type: 'inline',
          }
        }
      }
    });

    return Response.json(payload, {
      headers,
    });

  } catch (err) {
    logger.error(`${err}`);
    let actionError: ActionError = { message: "An unknown error occurred" };
    if (typeof err == "string") actionError.message = err;
    return Response.json(actionError, {
      status: 400,
      headers,
    });
  }
};
