import { MongoClient } from "mongodb";

const globalForMongo = globalThis as unknown as {
  mongoClient: MongoClient | undefined;
};

const client =
  globalForMongo.mongoClient ?? new MongoClient(process.env.MONGODB_URI!);

if (process.env.NODE_ENV !== "production") globalForMongo.mongoClient = client;

export function getDb() {
  return client.db();
}

export type DocumentType =
  | "lab_report"
  | "visit_note"
  | "discharge_summary"
  | "referral"
  | "prescription_leaflet"
  | "other";

export type HealthDocument = {
  _id?: import("mongodb").ObjectId;
  userId: string;
  type: DocumentType;
  title: string;
  sourceFileUrl: string;
  rawText: string;
  relatedMedicationId?: string;
  documentDate?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type DocumentChunk = {
  _id?: import("mongodb").ObjectId;
  documentId: import("mongodb").ObjectId;
  userId: string;
  text: string;
  embedding: number[];
  chunkIndex: number;
  createdAt: Date;
};

export function documentsCollection() {
  return getDb().collection<HealthDocument>("documents");
}

export function chunksCollection() {
  return getDb().collection<DocumentChunk>("chunks");
}
