const { createSecureUpload } = require('../helpers/multer'); 

const upload = createSecureUpload({
  allowImages: true,
  allowPDF: false,
  allowedImageFormats: ['jpeg','jpg','png','webp','gif'],
  maxFileSizeMB: 8,
  maxFiles: 1,
  imageMinWidth: 200,
  imageMinHeight: 200,
  imageMaxWidth: 6000,
  imageMaxHeight: 6000,
  allowAnimatedGif: false,
});

module.exports = upload;
