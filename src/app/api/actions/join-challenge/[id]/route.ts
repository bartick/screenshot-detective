import {
  ActionPostResponse,
  createPostResponse,
  ActionGetResponse,
  ActionPostRequest,
  createActionHeaders,
  ActionError,
  LinkedAction,
  MEMO_PROGRAM_ID,
} from "@solana/actions";
import { clusterApiUrl, ComputeBudgetProgram, Connection, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import logger from "@/common/logger";
import { BN } from "@coral-xyz/anchor";
import {
  CLUSTER_TYPES,
  I______________ById,
  IGetTxObject,
  ONCHAIN_PARTICIPATE_TYPE,
} from "@/common/types";
import { getRequestParam } from "@/common/helper/getParams";
import { ONCHAIN_CONFIG } from "@/common/helper/cluster.helper";
import { get______________ById } from "@/common/utils/api.util";
import { jsonResponse, Promisify } from "@/common/helper/responseMaker";
import { StatusCodes } from "http-status-codes";
import { GenericError } from "@/common/helper/error";
import { getTxObject, initWeb3, parseToPrecision, tokenAccounts } from "@/common/helper/helper";
import prisma from "@/lib/prisma";

// create the standard headers for this route (including CORS)
const headers = createActionHeaders();

export const GET = async (req: Request, { params: { id } }: {
  params: {
    id: string;
  };
}) => {
  try {
    logger.info("GET request received");
    const requestUrl = new URL(req.url);

    if (!id) {
      throw new GenericError("Challenge ID is required", StatusCodes.BAD_REQUEST);
    }

    if (isNaN(Number(id))) {
      throw new GenericError("Invalid Challenge ID", StatusCodes.BAD_REQUEST);
    }

    const gameToPay = await prisma.challenge.findUnique({
      select: {
        amount: true,
        token: true,
      },
      where: {
        id: parseInt(id),
      }
    });

    if (!gameToPay) {
      throw new GenericError("Challenge not found", StatusCodes.NOT_FOUND);
    }

    const payload: ActionGetResponse = {
      title: "Join This Challenge",
      icon: `${requestUrl.origin}/api/actions/join-challenge/image/${id}`,
      type: "action",
      description: `Guess what screen short it is to win ${gameToPay?.amount} ${gameToPay?.token}`,
      label: "Join",
      links: {
        actions: [
          {
            label: 'Lock My Answer',
            href: `${requestUrl.origin}/api/actions/join-challenge/${id}?answer={answer}`,
            type: 'transaction',
            parameters: [
              {
                name: 'answer',
                type: 'text',
                label: 'Enter your answer',
                required: true,
              }
            ]
          }
        ],
      },
    };

    return jsonResponse(payload, StatusCodes.OK, headers);
  } catch (err) {
    logger.error("An error occurred in GET handler: %s", err);
    const errorMessage = err instanceof GenericError ? err.message : "An unknown error occurred";
    const actionError: ActionError = { message: errorMessage };

    return jsonResponse(actionError, StatusCodes.BAD_REQUEST, headers);
  }
};

// DO NOT FORGET TO INCLUDE THE `OPTIONS` HTTP METHOD
// THIS WILL ENSURE CORS WORKS FOR BLINKS
export const OPTIONS = GET;

export const POST = async (req: Request, {params: {id}}: {params: {id: string}}) => {
  try {
    const requestUrl = new URL(req.url);
    let answer = getRequestParam<string>(requestUrl, "answer", true);

    if (!id) {
      throw 'Challenge ID is required';
    }

    if (isNaN(Number(id))) {
      throw 'Invalid Challenge ID';
    }

    if (!answer) {
      throw 'Answer is required';
    }

    const gameToPay = await prisma.challenge.findUnique({
      select: {
        amount: true,
        token: true,
        answer: true,
        url: true,
      },
      where: {
        id: parseInt(id),
      }
    });

    const body: ActionPostRequest = await req.json();

    const connection = new Connection(
      process.env.SOLANA_RPC! || clusterApiUrl("devnet"),
    );

    let account: PublicKey;
    try {
      account = new PublicKey(body.account);
    } catch (err) {
      throw 'Invalid "account" provided';
    }

    const onmessage = `Your answer is ${answer}`;

    const transaction = new Transaction()
      .add(
        ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: 0,
        }),
        new TransactionInstruction({
          programId: new PublicKey(MEMO_PROGRAM_ID),
          data: Buffer.from(onmessage, "utf8"),
          keys: [],
        }),
      )
    
    transaction.feePayer = account;

    transaction.recentBlockhash = (
      await connection.getLatestBlockhash()
    ).blockhash;

    if (!gameToPay) {
      throw 'Challenge not found';
    }

    if (gameToPay.answer !== answer) {
      const payload: ActionPostResponse = await createPostResponse({
        fields: {
          type: "transaction",
          transaction,
          message: "Sorry, your answer is incorrect",
          links: {
            next: {
              action: {
                description: `You have lost ${gameToPay.amount} ${gameToPay.token}`,
                icon: `${requestUrl.origin}/sad.jpg`,
                label: "You have lost",
                title: "Sorry!!!",
                type: 'action',
                disabled: true,
              },
              type: 'inline'
            }
          }
        },
      });
      return jsonResponse(payload, StatusCodes.OK, headers);
    } 

    const payload: ActionPostResponse = await createPostResponse({
      fields: {
        type: "transaction",
        transaction,
        message: "Congratulations, your answer is correct",
        links: {
          next: {
            action: {
              description: `You have won ${gameToPay.amount} ${gameToPay.token} have been transferred to your account`,
              icon: gameToPay.url,
              label: "You have won",
              title: "Bravo!!!",
              type: 'completed',
            },
            type: 'inline'
          }
        }
      },
    });

    // TODO: Add the logic to check if the answer is correct

    return jsonResponse(payload, StatusCodes.OK, headers);
  } catch (err) {
    logger.error(err);
    let actionError: ActionError = { message: "An unknown error occurred" };
    if (typeof err == "string") actionError.message = err;
    return jsonResponse(actionError, StatusCodes.BAD_REQUEST, headers);
  }
};
