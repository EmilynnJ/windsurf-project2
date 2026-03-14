import type { Handler } from "@netlify/functions";
import serverless from "serverless-http";
import { app } from "../../server/src/app";

const handler: Handler = serverless(app as any);

export { handler };
