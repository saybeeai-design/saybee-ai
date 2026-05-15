import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

let s3Client: S3Client | null = null;

const getStorageConfig = () => {
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const bucketName = process.env.AWS_S3_BUCKET_NAME;

  if (!region || !accessKeyId || !secretAccessKey || !bucketName) {
    throw new Error('AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY and AWS_S3_BUCKET_NAME must be configured');
  }

  return { region, accessKeyId, secretAccessKey, bucketName };
};

const getS3Client = (): S3Client => {
  if (s3Client) return s3Client;
  const { region, accessKeyId, secretAccessKey } = getStorageConfig();
  s3Client = new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
  return s3Client;
};

export const uploadFileToCloud = async (
  fileBuffer: Buffer,
  fileName: string,
  mimetype: string
): Promise<string> => {
  const { region, bucketName } = getStorageConfig();
  const client = getS3Client();

  const safeFileName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '');
  const uniqueKey = `resumes/${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeFileName}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: uniqueKey,
    Body: fileBuffer,
    ContentType: mimetype,
  });

  await (client as any).send(command);

  return `https://${bucketName}.s3.${region}.amazonaws.com/${uniqueKey}`;
};
