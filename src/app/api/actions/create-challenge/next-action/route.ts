import {
  createActionHeaders,
  NextActionPostRequest,
  ActionError,
  ActionPostResponse,
  createPostResponse,
  MEMO_PROGRAM_ID,
} from "@solana/actions";
import { clusterApiUrl, ComputeBudgetProgram, Connection, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";

import {
  ______________Type,
  VERIFIED_CURRENCY,
} from "@/common/types";
import { getRequestParam } from "@/common/helper/getParams";
import prisma from "@/lib/prisma";
import { createTransferInstruction, getOrCreateAssociatedTokenAccount } from "@solana/spl-token";

// create the standard headers for this route (including CORS)
const headers = createActionHeaders();

export const GET = async (req: Request) => {
  return Response.json({ message: "Method not supported" } as ActionError, {
    status: 403,
    headers,
  });
};
export const OPTIONS = async () => Response.json(null, { headers });

export const POST = async (req: Request) => {
  try {
    const requestUrl = new URL(req.url);
    const href = getRequestParam<string>(requestUrl, "href", true);
    const answer = getRequestParam<string>(requestUrl, "answer", true);
    const amount = getRequestParam<number>(requestUrl, "amount", true);
    const token = getRequestParam<VERIFIED_CURRENCY>(requestUrl, "token", true);
    const imageHeight = getRequestParam<number>(requestUrl, "imageHeight", true);
    const imageWidth = getRequestParam<number>(requestUrl, "imageWidth", true);
    const randomX = getRequestParam<number>(requestUrl, "randomX", true);
    const randomY = getRequestParam<number>(requestUrl, "randomY", true);

    const storeResult = await prisma.challenge.create({
      data: {
        url: href,
        answer: answer,
        imageHeight: imageHeight,
        imageWidth: imageWidth,
        randomX: randomX,
        randomY: randomY,
        amount: amount,
        token: token,
      }
    });

    const body: NextActionPostRequest = await req.json();

    const connection = new Connection(
      process.env.SOLANA_RPC! || clusterApiUrl("devnet"),
    );

    let account: PublicKey;
    try {
      account = new PublicKey(body.account);
    } catch (err) {
      throw 'Invalid "account" provided';
    }

    const memoMessage = "Create the toughest challenge";

    // const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
    //   connection,
    //   new PublicKey(body.account),
    //   new PublicKey(token),
    //   new PublicKey(body.account),
    // )

    const transaction = new Transaction()
      .add(
        // createTransferInstruction(
        //   new PublicKey(body.account),
        //   new PublicKey(""),
        //   new PublicKey(""),
        //   amount
        // )
        // SystemProgram.transfer({
        //   fromPubkey: new PublicKey(body.account),
        //   toPubkey: new PublicKey(""),
        //   lamports: amount * LAMPORTS_PER_SOL,
        // })
        ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: 0,
        }),
        new TransactionInstruction({
          programId: new PublicKey(MEMO_PROGRAM_ID),
          data: Buffer.from(memoMessage, "utf8"),
          keys: [],
        }),
      );

    transaction.feePayer = account;

    transaction.recentBlockhash = (
      await connection.getLatestBlockhash()
    ).blockhash;

    const url = requestUrl.origin + '/api/actions/join-challenge/' + storeResult.id;

    const payload: ActionPostResponse = await createPostResponse({
      fields: {
        transaction,
        type: 'transaction',
        message: "Challenge created",
        links: {
          next: {
            action: {
              icon: `${requestUrl.origin}/win.jpg`,
              title: "Screenshot Detective",
              description: `The challenge has been created successfully. The challenger will have to guess the original image.\n` +
                `The answer is ${answer}. The reward is ${amount} ${token}.\n` +
                `Go to ${url} to see the challenge.`,
              label: "Challenge Created",
              type: 'completed',
            },
            type: 'inline'
          }
        }
      }
    });

    return Response.json(payload, {
      headers,
    });
  } catch (err) {
    console.log(err);
    let actionError: ActionError = { message: "An unknown error occurred" };
    if (typeof err == "string") actionError.message = err;
    return Response.json(actionError, {
      status: 400,
      headers,
    });
  }
};