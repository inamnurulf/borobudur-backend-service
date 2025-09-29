const { body } = require('express-validator');

exports.validate = (method) => {
  switch (method) {
    case 'send-coordinate': {
      return [
        body('client_id', 'client_id is required').exists().isString(),
        body('latitude', 'latitude is required').exists().isFloat(),
        body('longitude', 'longitude is required').exists().isFloat(),
      ];
    }
  }
};
