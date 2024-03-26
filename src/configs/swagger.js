const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.1.0',
    info: {
      title: 'Angry Apes Society API',
      version: 'v0.0.1',
      description: 'API documentation for Angry Apes Society (AAS) application',
    },
  },
  host: "http://localhost:3030",
  basePath: "/api/",
  apis: [
    "src/routes/index.js",
  ], // Path to the API routes
};
const swaggerSpec = swaggerJSDoc(options);
module.exports = swaggerSpec;