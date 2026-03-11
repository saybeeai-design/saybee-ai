"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadFileToCloud = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3Client = new client_s3_1.S3Client({
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
const uploadFileToCloud = (fileBuffer, fileName, mimetype) => __awaiter(void 0, void 0, void 0, function* () {
    const isStubMode = !process.env.AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID.includes('stub');
    const safeFileName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '');
    const uniqueKey = `resumes/${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeFileName}`;
    if (isStubMode) {
        console.log(`[Storage Stub] Simulating upload for ${fileName}...`);
        return `https://${BUCKET_NAME}.s3.amazonaws.com/${uniqueKey}`;
    }
    const command = new client_s3_1.PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: uniqueKey,
        Body: fileBuffer,
        ContentType: mimetype,
    });
    yield s3Client.send(command);
    return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${uniqueKey}`;
});
exports.uploadFileToCloud = uploadFileToCloud;
