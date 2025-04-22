// Import dependencies
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Import configurations
const logger = require('./config/logger.js'); // Logger
const pool = require('./config/db.js'); // PostgreSQL connection


// // Routes
const exampleRoutes = require('./routes/example.route.js');
const v1Routes = require('./routes/v1')
app.use('/api/example', exampleRoutes);
app.use("/v1", v1Routes)

const setupSwagger = require('./config/swagger.js');
setupSwagger(app);


// Start server
app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
});

module.exports = { app, pool };
