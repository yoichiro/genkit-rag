import { googleAI, textEmbeddingGecko001 } from "@genkit-ai/googleai";
import { configureGenkit } from "@genkit-ai/core";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { defineFlow, run } from "@genkit-ai/flow";
import * as z from "zod";
import path from "path";
import { readFile } from "fs/promises";
import { chunk } from "llm-chunk";
import { embed } from "@genkit-ai/ai/embedder";

const indexConfig = {
  collection: "merch",
  contentField: "text",
  vectorField: "embedding",
  embedder: textEmbeddingGecko001,
};

configureGenkit({
  plugins: [googleAI({ apiVersion: ["v1", "v1beta"] })],
  enableTracingAndMetrics: false,
});

const firestore = getFirestore();

export const embedFlow = defineFlow(
  {
    name: "embedFlow",
    inputSchema: z.void(),
    outputSchema: z.void(),
  },
  async () => {
    const filePath = path.resolve("./shop-merch-google.txt");
    const textData = await run("extract-text", () => extractText(filePath));

    // const chunks = await run("chunk-it", async () =>
    //   chunk(textData, { delimiters: "---" }),
    // );
    const chunks = await run("chunk-it", async () =>
      textData.split(new RegExp("---")),
    );

    await run("index-chunks", async () => indexToFirestore(chunks));
  },
);

async function indexToFirestore(data: string[]) {
  for (const text of data) {
    const embedding = await embed({
      embedder: indexConfig.embedder,
      content: text,
    });

    await firestore.collection(indexConfig.collection).add({
      [indexConfig.vectorField]: FieldValue.vector(embedding),
      [indexConfig.contentField]: text,
    });
  }
}

async function extractText(filePath: string) {
  const f = path.resolve(filePath);
  return await readFile(f, "utf-8");
}
