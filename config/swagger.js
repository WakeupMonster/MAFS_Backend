const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "MAFS Dating App API",
      version: "1.0.0",
      description: "API documentation for the MAFS backend",
      contact: {
        name: "API Support",
        email: "support@mafs.com"
      }
    },
    servers: [
      {
        url: "/api/v1",  // Relative URL
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  apis: ["./docs/swagger.yaml"],
};

const swaggerSpec = swaggerJsdoc(options);

// Serve Swagger UI
const swaggerUiOptions = {
  explorer: true,
  customSiteTitle: "MAFS API Documentation",
  customCss: '.swagger-ui .topbar { display: none }',
  customfavIcon: '/favicon.ico'
};

module.exports = {
  swaggerUi,
  swaggerSpec,
  swaggerUiOptions
};