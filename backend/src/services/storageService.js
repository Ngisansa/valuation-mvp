const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const STORAGE = process.env.STORAGE || "disk";

let s3 = null;
if (STORAGE === "s3") {
  s3 = new S3Client({
    region: process.env.S3_REGION || "us-east-1",
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
      accessKeyId: process.env.S3_KEY,
      secretAccessKey: process.env.S3_SECRET
    },
    forcePathStyle: true
  });
}

module.exports = {
  uploadBuffer: async (key, buffer, contentType) => {
    if (!s3) throw new Error("S3 not configured");
    const bucket = process.env.S3_BUCKET;
    const cmd = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType
    });
    await s3.send(cmd);
  },

  getDownloadUrl: async (key) => {
    if (!s3) throw new Error("S3 not configured");
    const cmd = new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key });
    const url = await getSignedUrl(s3, cmd, { expiresIn: 60 * 60 });
    return url;
  }
};
