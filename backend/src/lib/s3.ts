import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getEnv } from "./env.ts";

let _s3: S3Client | undefined;
let _s3Public: S3Client | undefined;

export function getS3(): S3Client {
  if (_s3) return _s3;
  const env = getEnv();
  _s3 = new S3Client({
    endpoint: env.S3_ENDPOINT,
    region: "us-east-1",
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY,
      secretAccessKey: env.S3_SECRET_KEY,
    },
    forcePathStyle: true,
  });
  return _s3;
}

function getS3Public(): S3Client {
  if (_s3Public) return _s3Public;
  const env = getEnv();
  const endpoint = env.S3_PUBLIC_ENDPOINT || env.S3_ENDPOINT;
  _s3Public = new S3Client({
    endpoint,
    region: "us-east-1",
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY,
      secretAccessKey: env.S3_SECRET_KEY,
    },
    forcePathStyle: true,
  });
  return _s3Public;
}

export async function initBucket(): Promise<void> {
  const s3 = getS3();
  const { S3_BUCKET } = getEnv();
  try {
    await s3.send(new HeadBucketCommand({ Bucket: S3_BUCKET }));
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: S3_BUCKET }));
  }
}

export async function putObject(
  key: string,
  body: Uint8Array,
  contentType: string,
  contentLength: number,
): Promise<void> {
  const s3 = getS3();
  const { S3_BUCKET } = getEnv();
  await s3.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      ContentLength: contentLength,
    }),
  );
}

export async function deleteObject(key: string): Promise<void> {
  const s3 = getS3();
  const { S3_BUCKET } = getEnv();
  await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }));
}

export async function getPresignedDownloadUrl(
  key: string,
  expiresIn = 300,
): Promise<string> {
  const s3 = getS3Public();
  const { S3_BUCKET } = getEnv();
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }),
    { expiresIn },
  );
}
