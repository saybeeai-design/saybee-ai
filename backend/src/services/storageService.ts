import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'stub-access-key',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'stub-secret-key',
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || 'saybeeai-resumes-stub';

/**
 * Uploads a file buffer to S3 or an S3-compatible cloud storage.
 * If AWS credentials are not set, it operates in stub mode.
 */
export const uploadFileToCloud = async (
  fileBuffer: Buffer,
  fileName: string,
  mimetype: string
): Promise<string> => {
  const isStubMode = !process.env.AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID.includes('stub');

  const safeFileName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '');
  const uniqueKey = `resumes/${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeFileName}`;

  if (isStubMode) {
    console.log(`[Storage Stub] Simulating upload for ${fileName}...`);
    return `https://${BUCKET_NAME}.s3.amazonaws.com/${uniqueKey}`;
  }

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: uniqueKey,
    Body: fileBuffer,
    ContentType: mimetype,
  });

  await (s3Client as any).send(command);

  return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${uniqueKey}`;
};
