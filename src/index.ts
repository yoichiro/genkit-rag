import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { configureGenkit } from "@genkit-ai/core";
import { dotprompt, defineDotprompt } from "@genkit-ai/dotprompt";
import { firebase, defineFirestoreRetriever } from "@genkit-ai/firebase";
import {
  gemini15Flash,
  googleAI,
  textEmbeddingGecko001,
} from "@genkit-ai/googleai";
import * as z from "zod";
import { onFlow } from "@genkit-ai/firebase/functions";
import { firebaseAuth } from "@genkit-ai/firebase/auth";
import { retrieve } from "@genkit-ai/ai";

const firebaseConfig = {
  apiKey: "AIzaSyB-Qzko104l5C1Ru2-Pmo0WoQzW_VV8H2M",
  authDomain: "genkit-rag-fe54d.firebaseapp.com",
  projectId: "genkit-rag-fe54d",
  storageBucket: "genkit-rag-fe54d.appspot.com",
  messagingSenderId: "750906817942",
  appId: "1:750906817942:web:a1d0a0a193765a092431b7",
};

const app = admin.initializeApp(firebaseConfig);
const firestore = getFirestore(app);

configureGenkit({
  plugins: [dotprompt(), firebase(), googleAI()],
  flowStateStore: "firebase",
  logLevel: "debug",
  traceStore: "firebase",
  enableTracingAndMetrics: true,
});

const retrieverRef = defineFirestoreRetriever({
  name: "merchRetriever",
  firestore,
  collection: "merch",
  contentField: "text",
  vectorField: "embedding",
  embedder: textEmbeddingGecko001,
  distanceMeasure: "COSINE",
});

const MerchQuestionInputSchema = z.object({
  data: z.array(z.string()),
  question: z.string(),
});

const merchPrompt = defineDotprompt(
  {
    name: "merchPrompt",
    model: gemini15Flash,
    input: {
      schema: MerchQuestionInputSchema,
    },
    output: {
      format: "text",
    },
    config: {
      temperature: 0.3,
    },
  },
  `
  You are a customer service AI for an online store.
  Given a customer's question and product information from the database,
  recommend the most suitable products.
  
  Product Database:
  {{#each data~}}
  - {{this}}
  {{~/each}}
  
  Customer's Question:
  {{question}}
  `,
);

export const merchFlow = onFlow(
  {
    name: "merchFlow",
    inputSchema: z.string(),
    outputSchema: z.string(),
    authPolicy: firebaseAuth((user) => {
      if (!user.email_verified) {
        throw new Error("Verified email required to run flow");
      }
    }),
  },
  async (question) => {
    const docs = await retrieve({
      retriever: retrieverRef,
      query: question,
      options: { limit: 5 },
    });

    const llmResponse = await merchPrompt.generate({
      input: {
        data: docs.map((doc) => doc.content[0].text || ""),
        question,
      },
    });

    return llmResponse.text();
  },
);

export { embedFlow } from "./merch_embed";
