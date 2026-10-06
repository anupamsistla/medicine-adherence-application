const VOYAGE_MODEL = "voyage-3";

type VoyageEmbeddingResponse = {
  data: { embedding: number[]; index: number }[];
};

async function embed(input: string[], inputType: "document" | "query"): Promise<number[][]> {
  const res = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({ input, model: VOYAGE_MODEL, input_type: inputType }),
  });

  if (!res.ok) {
    throw new Error(`Voyage embedding request failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as VoyageEmbeddingResponse;
  return data.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

export async function embedChunks(texts: string[]): Promise<number[][]> {
  return embed(texts, "document");
}

export async function embedQuery(text: string): Promise<number[]> {
  const [embedding] = await embed([text], "query");
  return embedding;
}
