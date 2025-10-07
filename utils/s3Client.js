import AWS from "aws-sdk";

const spacesEndpoint = new AWS.Endpoint("nyc3.digitaloceanspaces.com"); // change region if needed

export const s3 = new AWS.S3({
  endpoint: spacesEndpoint,
  accessKeyId: process.env.DO_SPACES_KEY,
  secretAccessKey: process.env.DO_SPACES_SECRET,
});
