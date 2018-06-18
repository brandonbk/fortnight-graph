const { Schema } = require('mongoose');
const accountService = require('../services/account');

const { IMGIX_URL } = process.env;

const focalPointSchema = new Schema({
  x: {
    type: Number,
    required: true,
    min: 0,
    max: 1,
  },
  y: {
    type: Number,
    required: true,
    min: 0,
    max: 1,
  },
});

const schema = new Schema({
  filename: {
    type: String,
    trim: true,
    required: true,
    set(v) {
      // Ensure the filename is always decoded.
      return decodeURIComponent(v);
    },
    get(v) {
      // Ensure the filename is always decoded.
      return decodeURIComponent(v);
    },
  },
  s3: {
    bucket: String,
    location: String,
  },
  uploadedAt: {
    type: Date,
  },
  mimeType: {
    type: String,
    enum: ['image/jpeg', 'image/png', 'image/webm', 'image/gif'],
  },
  size: {
    type: Number,
    min: 0,
  },
  width: {
    type: Number,
    min: 0,
  },
  height: {
    type: Number,
    min: 0,
  },
  focalPoint: focalPointSchema,
});

schema.methods.getKey = async function getKey() {
  // The S3 bucket key. Generated from the account key, image id, and filename.
  const { key } = await accountService.retrieve();
  return `${key}/${this.id}/${this.filename}`;
};

schema.methods.getSrc = async function getSrc() {
  // The image src, for use with `img` elements.
  // Generated from the imgix url, the encoded account key, the id, and the encoded filename.
  const { key } = await accountService.retrieve();
  return `${IMGIX_URL}/${encodeURIComponent(key)}/${this.id}/${encodeURIComponent(this.filename)}`;
};

module.exports = schema;
