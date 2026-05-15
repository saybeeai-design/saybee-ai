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
let s3Client = null;
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
const getS3Client = () => {
    if (s3Client)
        return s3Client;
    const { region, accessKeyId, secretAccessKey } = getStorageConfig();
    s3Client = new client_s3_1.S3Client({
        region,
        credentials: {
            accessKeyId,
            secretAccessKey,
        },
    });
    return s3Client;
};
const uploadFileToCloud = (fileBuffer, fileName, mimetype) => __awaiter(void 0, void 0, void 0, function* () {
    const { region, bucketName } = getStorageConfig();
    const client = getS3Client();
    const safeFileName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '');
    const uniqueKey = `resumes/${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeFileName}`;
    const command = new client_s3_1.PutObjectCommand({
        Bucket: bucketName,
        Key: uniqueKey,
        Body: fileBuffer,
        ContentType: mimetype,
    });
    yield client.send(command);
    return `https://${bucketName}.s3.${region}.amazonaws.com/${uniqueKey}`;
});
exports.uploadFileToCloud = uploadFileToCloud;
