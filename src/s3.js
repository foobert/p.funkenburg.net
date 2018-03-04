const AWS = require("aws-sdk");

const config = {
  s3ForcePathStyle: true,
  accessKeyId: "ACCESS_KEY_ID",
  secretAccessKey: "SECRET_ACCESS_KEY",
  endpoint: new AWS.Endpoint("http://localhost:4572")
};
module.exports = new AWS.S3(config);
