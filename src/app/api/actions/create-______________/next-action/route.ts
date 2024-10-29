import {
  createActionHeaders,
  NextActionPostRequest,
  ActionError,
  CompletedAction,
} from "@solana/actions";
import { PublicKey } from "@solana/web3.js";

import {
  ______________Type,
  CLUSTER_TYPES,
  I______________,
  VERIFIED_CURRENCY,
} from "@/common/types";
import logger from "@/common/logger";
import { getRequestParam } from "@/common/helper/getParams";
import { GenericError } from "@/common/helper/error";
import { create______________ } from "@/common/utils/api.util";
import { StatusCodes } from "http-status-codes";
import { jsonResponse, Promisify } from "@/common/helper/responseMaker";

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
    /////////////////////////////////////
    /////////Extract Params//////////////
    /////////////////////////////////////
    const requestUrl = new URL(req.url);
    const clusterurl = getRequestParam<CLUSTER_TYPES>(requestUrl, "clusterurl");
    const name = getRequestParam<string>(requestUrl, "name");
    const token = getRequestParam<VERIFIED_CURRENCY>(requestUrl, "token");
    const wager = getRequestParam<number>(requestUrl, "wager");
    const startDate = getRequestParam<number>(requestUrl, "startDate");
    const endDate = getRequestParam<number>(requestUrl, "endDate");

    /////////////////////////////////////
    /////////Extract Account/////////////
    /////////////////////////////////////
    const body: NextActionPostRequest = await req.json();
    let account: PublicKey;
    try {
      account = new PublicKey(body.account);
    } catch {
      throw new GenericError("Invalid account provided", StatusCodes.BAD_REQUEST);
    }

    let signature: string;
    try {
      signature = body.signature!;
      if (!signature) throw "Invalid signature";
    } catch (err) {
      throw new GenericError('Invalid "signature" provided', StatusCodes.BAD_REQUEST);
    }
    /////////////////////////////////////
    ///////////Parse Phase///////////////
    /////////////////////////////////////
    const ______________Json: I______________ = {
      Name: name,
    };
    const ______________ = await Promisify<______________Type>(
      create______________(clusterurl, ______________Json),
    );
    const basicUrl =
      process.env.IS_PROD === "prod"
        ? "https://join.catoff.xyz" // TODO: edit link here
        : new URL(req.url).origin;
    const icons = {
      name: new URL("/name.png", basicUrl).toString(), // TODO: edit link here
    };

    const message = `Your ______________ has been created successfully!\nJoin with blink: https://dial.to/?action=solana-action%3Ahttps%3A%2F%2F{LINK}%2Fapi%2Factions%2F{______________}%3Fclusterurl%3D${clusterurl}%26{______________ID}%3D{______________.ID}&cluster=${clusterurl}`; // TODO: edit link here
    logger.info(`[Create ______________ next action] final response: ${message}`);
    const payload: CompletedAction = {
      type: "completed",
      title: "Your ______________ has been created successfully!",
      icon: icons.name,
      label: "Catoff ______________ Created",
      description: message,
    };

    return jsonResponse(payload, StatusCodes.OK, headers);
  } catch (err) {
    logger.error(err);
    let actionError: ActionError = { message: "An unknown error occurred" };
    if (typeof err == "string") actionError.message = err;
    return jsonResponse(actionError, StatusCodes.BAD_REQUEST, headers);
  }
};
