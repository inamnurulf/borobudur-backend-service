// image-service.js
// npm i sharp
// Requires Node 18+ (global fetch, Blob, FormData). For Node ≤16, bring in undici: globalThis.fetch = (...); const { Blob, FormData } = require('undici');

const sharp = require('sharp');

class ImageService {
  /**
   * @param {object} cfg
   * @param {string} cfg.baseUrl          e.g. process.env.HYPERBASE_HOST
   * @param {string} cfg.projectId        e.g. process.env.HYPERBASE_PROJECT_ID
   * @param {string} cfg.bucketId         e.g. process.env.HYPERBASE_BUCKET_ID
   * @param {() => (string|null)} cfg.getAuthToken  function returning token string
   * @param {(msg:string, status?:number, details?:any)=>Error} [cfg.createError] custom error factory
   * @param {boolean} [cfg.queryToken=true] If true, append ?token= to GET URLs in getImageUrl
   */
  constructor({
    baseUrl,
    projectId,
    bucketId,
    getAuthToken,
    createError,
    queryToken = true,
  }) {
    this.baseUrl = baseUrl;
    this.projectId = projectId;
    this.bucketId = bucketId;
    this.getAuthToken = getAuthToken;
    this.queryToken = queryToken;
    this.createError =
      createError ||
      ((message, statusCode = 500, details) => {
        const err = new Error(message || 'ImageService error');
        err.statusCode = statusCode;
        if (details) err.details = details;
        return err;
      });

    if (!this.baseUrl || !this.projectId || !this.bucketId) {
      throw this.createError(
        'ImageService: Missing baseUrl/projectId/bucketId in constructor.',
        500
      );
    }
    if (typeof this.getAuthToken !== 'function') {
      throw this.createError('ImageService: getAuthToken must be a function.', 500);
    }
  }

  // Internal: REST endpoints
  _uploadEndpoint() {
    return `${this.baseUrl}/api/rest/project/${this.projectId}/bucket/${this.bucketId}/file`;
  }
  _fileEndpoint(imageId) {
    return `${this.baseUrl}/api/rest/project/${this.projectId}/bucket/${this.bucketId}/file/${imageId}`;
  }

  /**
   * Build a public URL for an image id. Returns null if no id.
   * Optionally appends ?token= for services that support query tokens.
   */
  getImageUrl(imageId) {
    if (!imageId) return null;
    const url = this._fileEndpoint(imageId);
    if (!this.queryToken) return url;
    const token = this.getAuthToken();
    return token ? `${url}?token=${token}` : url;
  }

  /**
   * Upload a file buffer to the storage service.
   * @param {object} p
   * @param {Buffer|Uint8Array} p.buffer
   * @param {string} p.filename
   * @param {string} p.mimeType
   * @param {boolean} [p.public=true]
   * @param {Record<string,string|number|boolean>} [p.extraFields] additional multipart fields (metadata, etc.)
   * @returns {Promise<{ id:string, url:string|null, raw:any }>}
   */
  async uploadImage({ buffer, filename, mimeType, public: isPublic = true, extraFields = {} }) {
    if (!buffer || !filename || !mimeType) {
      throw this.createError(
        'uploadImage: buffer, filename, and mimeType are required.',
        400
      );
    }

    const blob = new Blob([buffer], { type: mimeType });
    const form = new FormData();
    form.append('file', blob, filename);
    form.append('file_name', filename);
    form.append('public', String(!!isPublic));
    for (const [k, v] of Object.entries(extraFields)) {
      form.append(k, String(v));
    }

    const token = this.getAuthToken();
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(this._uploadEndpoint(), {
      method: 'POST',
      body: form,
      headers,
    });

    let payload;
    try {
      payload = await res.json();
    } catch {
      payload = null;
    }

    if (!res.ok) {
      throw this.createError(
        payload?.message || `Image upload failed with status ${res.status}`,
        res.status,
        payload
      );
    }

    const id = payload?.data?.id;
    if (!id) {
      throw this.createError('Upload succeeded but no image ID returned.', 500, payload);
    }

    return {
      id,
      url: this.getImageUrl(id),
      raw: payload,
    };
  }

  /**
   * Generate a thumbnail from an image buffer using `sharp`.
   * Defaults produce a WEBP ~quality 70, 16:9-ish or fit:cover to target WxH.
   * @param {object} p
   * @param {Buffer|Uint8Array} p.buffer
   * @param {number} [p.width=800]
   * @param {number} [p.height=450]
   * @param {'cover'|'contain'|'inside'|'outside'|'fill'} [p.fit='cover']
   * @param {'webp'|'jpeg'|'png'|'avif'} [p.format='webp']
   * @param {number} [p.quality=70]   // 1-100 (or codec specific)
   * @param {boolean} [p.withMetadata=false] // keep EXIF/ICC
   * @returns {Promise<{ buffer:Buffer, mimeType:string, suggestedExt:string }>}
   */
  async generateThumbnail({
    buffer,
    width = 800,
    height = 450,
    fit = 'cover',
    format = 'webp',
    quality = 70,
    withMetadata = false,
  }) {
    if (!buffer) {
      throw this.createError('generateThumbnail: buffer is required.', 400);
    }

    let pipeline = sharp(buffer).resize({ width, height, fit });

    if (withMetadata) pipeline = pipeline.withMetadata();

    let mimeType = 'image/webp';
    let suggestedExt = 'webp';

    switch (format) {
      case 'jpeg':
        pipeline = pipeline.jpeg({ quality, mozjpeg: true });
        mimeType = 'image/jpeg';
        suggestedExt = 'jpg';
        break;
      case 'png':
        // PNG doesn't use "quality" directly the same way; keep lossless-ish
        pipeline = pipeline.png();
        mimeType = 'image/png';
        suggestedExt = 'png';
        break;
      case 'avif':
        pipeline = pipeline.avif({ quality });
        mimeType = 'image/avif';
        suggestedExt = 'avif';
        break;
      case 'webp':
      default:
        pipeline = pipeline.webp({ quality });
        mimeType = 'image/webp';
        suggestedExt = 'webp';
        break;
    }

    const out = await pipeline.toBuffer();
    return { buffer: out, mimeType, suggestedExt };
  }

  /**
   * Compress an image without resizing (useful for storage/bandwidth).
   * @param {object} p
   * @param {Buffer|Uint8Array} p.buffer
   * @param {'webp'|'jpeg'|'avif'|'png'} [p.format='webp']
   * @param {number} [p.quality=70]
   * @param {boolean} [p.withMetadata=false]
   * @returns {Promise<{ buffer:Buffer, mimeType:string, suggestedExt:string }>}
   */
  async compressImage({ buffer, format = 'webp', quality = 70, withMetadata = false }) {
    if (!buffer) {
      throw this.createError('compressImage: buffer is required.', 400);
    }

    let pipeline = sharp(buffer);
    if (withMetadata) pipeline = pipeline.withMetadata();

    let mimeType = 'image/webp';
    let suggestedExt = 'webp';

    switch (format) {
      case 'jpeg':
        pipeline = pipeline.jpeg({ quality, mozjpeg: true });
        mimeType = 'image/jpeg';
        suggestedExt = 'jpg';
        break;
      case 'png':
        pipeline = pipeline.png(); // PNG is lossless; size may be larger
        mimeType = 'image/png';
        suggestedExt = 'png';
        break;
      case 'avif':
        pipeline = pipeline.avif({ quality });
        mimeType = 'image/avif';
        suggestedExt = 'avif';
        break;
      case 'webp':
      default:
        pipeline = pipeline.webp({ quality });
        mimeType = 'image/webp';
        suggestedExt = 'webp';
        break;
    }

    const out = await pipeline.toBuffer();
    return { buffer: out, mimeType, suggestedExt };
  }

  /**
   * Convenience: upload original + generated thumbnail (+ optional compressed original)
   * @param {object} p
   * @param {Buffer|Uint8Array} p.buffer            original file buffer
   * @param {string} p.filename                      original filename (e.g. "photo.jpg")
   * @param {string} p.mimeType                      original mimeType (e.g. "image/jpeg")
   * @param {boolean} [p.public=true]
   * @param {object} [p.thumb]                       generateThumb options (see generateThumbnail)
   * @param {boolean|object} [p.compress=false]      pass true or {format, quality, withMetadata}
   * @param {Record<string,string|number|boolean>} [p.extraFields] added to both uploads
   * @returns {Promise<{
   *   original: { id: string, url: string|null },
   *   thumbnail?: { id: string, url: string|null },
   *   compressed?: { id: string, url: string|null }
   * }>}
   */
  async uploadImageWithThumbnail({
    buffer,
    filename,
    mimeType,
    public: isPublic = true,
    thumb = { width: 800, height: 450, fit: 'cover', format: 'webp', quality: 70 },
    compress = false,
    extraFields = {},
  }) {
    // Upload original
    const original = await this.uploadImage({
      buffer,
      filename,
      mimeType,
      public: isPublic,
      extraFields: { ...extraFields, variant: extraFields.variant || 'original' },
    });

    // Thumbnail (optional)
    let thumbnail;
    if (thumb) {
      const t = await this.generateThumbnail({ buffer, ...thumb });
      const thumbName = this._appendSuffixToFilename(filename, `thumb.${t.suggestedExt}`);
      const up = await this.uploadImage({
        buffer: t.buffer,
        filename: thumbName,
        mimeType: t.mimeType,
        public: isPublic,
        extraFields: { ...extraFields, variant: 'thumbnail' },
      });
      thumbnail = { id: up.id, url: up.url };
    }

    // Compressed original (optional)
    let compressed;
    if (compress) {
      const opts = typeof compress === 'object' ? compress : {};
      const c = await this.compressImage({ buffer, ...opts });
      const compName = this._appendSuffixToFilename(filename, `compressed.${c.suggestedExt}`);
      const up = await this.uploadImage({
        buffer: c.buffer,
        filename: compName,
        mimeType: c.mimeType,
        public: isPublic,
        extraFields: { ...extraFields, variant: 'compressed' },
      });
      compressed = { id: up.id, url: up.url };
    }

    return { original: { id: original.id, url: original.url }, thumbnail, compressed };
  }

  // ---- helpers -------------------------------------------------------------

  _appendSuffixToFilename(filename, suffixWithExt) {
    // e.g. ("photo.jpg", "thumb.webp") -> "photo.thumb.webp"
    const lastDot = filename.lastIndexOf('.');
    if (lastDot <= 0) return `${filename}.${suffixWithExt}`;
    const base = filename.slice(0, lastDot);
    return `${base}.${suffixWithExt}`;
  }

  // You can add update/delete later, using the same endpoints:
  // async deleteImage(id) { ... }
  // async updateImage(id, formData) { ... }
}

const { getAuthToken } = require('../worker/hyperbaseAuthWorker');
const CustomError = require('../helpers/customError');

const imageService = new ImageService({
  baseUrl: process.env.HYPERBASE_HOST,
  projectId: process.env.HYPERBASE_PROJECT_ID,
  bucketId: process.env.HYPERBASE_BUCKET_ID,
  getAuthToken,
  createError: (msg, status, details) => new CustomError({ message: msg, statusCode: status, details }),
});

module.exports = imageService;