/**
 * SWAGGER / OPENAPI SPECIFICATION DEFINITION
 * 
 * WHY IT EXISTS:
 * Documentation is a critical component of professional backend APIs. Swagger/OpenAPI 
 * provides an interactive, standardized web interface allowing developers (and students) 
 * to view schemas, read description briefs, and execute test requests directly from the browser.
 * 
 * WHAT IT DOES:
 * - Exports the complete OpenAPI 3.0.0 JSON specification for the M-Pesa STK Demo.
 * - Group endpoints under cleanly separated tagged sections with custom emojis.
 * - Documents routes, parameters, request body schemas, and success/error response structures.
 * 
 * WHEN IT SHOULD BE USED:
 * Imported in app.js and mounted via swagger-ui-express to serve the interactive documentation 
 * at the /docs route.
 */

export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: '🟢 M-Pesa STK Demo API',
    version: '1.0.0',
    description: `## Welcome 👋

This is a production-inspired REST API demonstrating Safaricom Daraja STK Push integration using Node.js, Express, ES Modules, and Layered Architecture.

### Features

- **OAuth Token Generation:** Automated bearer token generation with in-memory caching to optimize network performance.
- **STK Push (M-Pesa Express):** Initiates payment prompts directly to user handsets.
- **Callback Handling:** A webhook receiver that parses asynchronous M-Pesa transaction results.
- **Transaction Status:** Programmatically queries payment statuses from Daraja.
- **Clean Architecture:** Strict separation of routes, controllers, services, clients, and middleware.
- **Structured Logging:** Centralized logging using Morgan and unified error formatting.

---

**Built with ❤️ using:**
Node.js, Express.js, Swagger, and Layered Architecture.`
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Local Development Server'
    }
  ],
  tags: [
    {
      name: '🔐 Authentication',
      description: 'System authorization and Daraja OAuth token generation.'
    },
    {
      name: '💳 Payments',
      description: 'Triggering payments prompts (STK Push) and querying transaction status.'
    },
    {
      name: '🔔 Callbacks',
      description: 'Webhook listeners that receive asynchronous payment transaction updates from Safaricom.'
    },
    {
      name: '📊 Health',
      description: 'Monitoring and uptime diagnostics.'
    }
  ],
  paths: {
    '/api/health': {
      get: {
        summary: 'Check API Health Status',
        description: 'Verifies the server is online and returns uptime and memory usage metrics.',
        tags: ['📊 Health'],
        responses: {
          200: {
            description: 'API is healthy and online.',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/SuccessResponse'
                },
                example: {
                  success: true,
                  message: 'M-Pesa STK Demo API is fully operational.',
                  data: {
                    status: 'UP',
                    environment: 'development',
                    uptime: '45.12 seconds',
                    timestamp: '2026-07-16T22:35:40.000Z',
                    memoryUsage: {
                      rss: '32.14 MB',
                      heapTotal: '15.42 MB',
                      heapUsed: '8.12 MB'
                    },
                    nodeVersion: 'v20.11.0'
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/auth/token': {
      get: {
        summary: 'Generate OAuth Access Token',
        description: 'Requests a fresh OAuth access token from Safaricom Daraja, or returns a cached one if it is still valid.',
        tags: ['🔐 Authentication'],
        responses: {
          200: {
            description: 'Access token generated or fetched from cache.',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/SuccessResponse'
                },
                example: {
                  success: true,
                  message: 'M-Pesa OAuth Access Token generated successfully.',
                  data: {
                    accessToken: 'uJDVQKu4wksmdSRp7ha7MtTn9gTq',
                    tokenType: 'Bearer',
                    expiresIn: 'Check console logs for absolute cache expiry timestamp'
                  }
                }
              }
            }
          },
          500: {
            description: 'Server error or Safaricom API rejection.',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                },
                example: {
                  success: false,
                  message: 'Daraja OAuth Access Token Generation failed [HTTP 400] [Code DARAJA_ERROR]: Unknown Daraja API error',
                  errors: [
                    {
                      code: 'DARAJA_ERROR',
                      details: 'Unknown Daraja API error'
                    }
                  ]
                }
              }
            }
          }
        }
      }
    },
    '/api/payments/stkpush': {
      post: {
        summary: 'Initiate STK Push Payment Prompt',
        description: `Initiate an STK Push payment request to a customer's phone.

The API validates the request, generates a Daraja password, obtains an OAuth token, sends the STK Push, and registers the transaction checkout ID.`,
        tags: ['💳 Payments'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/STKPushRequest'
              }
            }
          }
        },
        responses: {
          200: {
            description: 'STK push successfully triggered on customer device.',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/SuccessResponse'
                },
                example: {
                  success: true,
                  message: 'STK Push payment prompt initiated successfully. Check your handset for the M-Pesa PIN prompt.',
                  data: {
                    merchantRequestId: '12345-67890-1',
                    checkoutRequestId: 'ws_CO_16072026223540892',
                    responseCode: '0',
                    responseDescription: 'Success. Request accepted for processing',
                    customerMessage: 'Success. Request accepted for processing'
                  }
                }
              }
            }
          },
          400: {
            description: 'Invalid input fields.',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                },
                example: {
                  success: false,
                  message: 'Request validation failed.',
                  errors: [
                    {
                      field: 'phoneNumber',
                      message: 'Invalid Kenyan phone number format. Examples: 0712345678 or 254712345678.'
                    }
                  ]
                }
              }
            }
          },
          500: {
            description: 'API communication error or Daraja rejection.',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                },
                example: {
                  success: false,
                  message: 'Daraja STK Push Initiation failed [HTTP 500] [Code 500.001.1001]: Internal System Error',
                  errors: [
                    {
                      code: '500.001.1001',
                      details: 'Internal System Error'
                    }
                  ]
                }
              }
            }
          }
        }
      }
    },
    '/api/payments/query': {
      post: {
        summary: 'Query STK Push Status',
        description: 'Queries Safaricom servers to check the current status of an STK Push payment using the CheckoutRequestID.',
        tags: ['💳 Payments'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/STKQueryRequest'
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Status successfully queried.',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/SuccessResponse'
                },
                example: {
                  success: true,
                  message: 'STK Push transaction query completed.',
                  data: {
                    merchantRequestId: '12345-67890-1',
                    checkoutRequestId: 'ws_CO_16072026223540892',
                    resultCode: '0',
                    resultDescription: 'The service request is processed successfully.'
                  }
                }
              }
            }
          },
          400: {
            description: 'Validation failed.',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                },
                example: {
                  success: false,
                  message: 'Request validation failed.',
                  errors: [
                    {
                      field: 'checkoutRequestId',
                      message: 'CheckoutRequestId is required.'
                    }
                  ]
                }
              }
            }
          },
          500: {
            description: 'Daraja Error.',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                },
                example: {
                  success: false,
                  message: 'Daraja STK Push Query failed [HTTP 500] [Code 500.001.1001]: The transaction does not Exist',
                  errors: [
                    {
                      code: '500.001.1001',
                      details: 'The transaction does not Exist'
                    }
                  ]
                }
              }
            }
          }
        }
      }
    },
    '/api/payments/callback': {
      post: {
        summary: 'Receive M-Pesa Callback (Safaricom Webhook)',
        description: 'The endpoint registered on Daraja where Safaricom posts async transaction results.',
        tags: ['🔔 Callbacks'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                description: 'Raw M-Pesa Callback Payload'
              },
              example: {
                Body: {
                  stkCallback: {
                    MerchantRequestID: '12345-67890-1',
                    CheckoutRequestID: 'ws_CO_16072026223540892',
                    ResultCode: 0,
                    ResultDesc: 'The service request is processed successfully.',
                    CallbackMetadata: {
                      Item: [
                        { Name: 'Amount', Value: 1.00 },
                        { Name: 'MpesaReceiptNumber', Value: 'NL12345678' },
                        { Name: 'Balance', Value: 0.00 },
                        { Name: 'TransactionDate', Value: 20260716223540 },
                        { Name: 'PhoneNumber', Value: 254714747942 }
                      ]
                    }
                  }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Callback acknowledged.',
            content: {
              'application/json': {
                example: {
                  ResponseCode: '0',
                  ResponseDesc: 'Callback received and processed successfully'
                }
              }
            }
          },
          400: {
            description: 'Callback formatting error.',
            content: {
              'application/json': {
                example: {
                  ResponseCode: '1',
                  ResponseDesc: 'Callback parsing failed'
                }
              }
            }
          }
        }
      },
      get: {
        summary: 'List Received Callbacks',
        description: 'Returns the log of recently received payment callbacks currently stored in the server memory.',
        tags: ['🔔 Callbacks'],
        responses: {
          200: {
            description: 'List of received callbacks.',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/SuccessResponse'
                },
                example: {
                  success: true,
                  message: 'Recent received M-Pesa callbacks retrieved successfully.',
                  data: {
                    count: 1,
                    callbacks: [
                      {
                        merchantRequestId: '12345-67890-1',
                        checkoutRequestId: 'ws_CO_16072026223540892',
                        resultCode: 0,
                        resultDescription: 'The service request is processed successfully.',
                        status: 'SUCCESS',
                        timestamp: '2026-07-16T22:36:12.000Z',
                        metadata: {
                          amount: 1,
                          mpesaReceiptNumber: 'NL12345678',
                          transactionDate: '2026-07-16T22:35:40+03:00',
                          phoneNumber: 254714747942
                        }
                      }
                    ]
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Authorization header using Bearer scheme: Bearer <JWT>'
      },
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'x-api-key',
        description: 'API Key authorization header: x-api-key: your-api-key'
      }
    },
    schemas: {
      SuccessResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true
          },
          message: {
            type: 'string',
            example: 'Operation successful.'
          },
          data: {
            type: 'object',
            nullable: true
          }
        }
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false
          },
          message: {
            type: 'string',
            example: 'Something went wrong.'
          },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: {
                  type: 'string',
                  example: 'phoneNumber'
                },
                message: {
                  type: 'string',
                  example: 'PhoneNumber is required.'
                }
              }
            }
          }
        }
      },
      STKPushRequest: {
        type: 'object',
        required: ['amount', 'phoneNumber'],
        properties: {
          amount: {
            type: 'number',
            description: 'The amount of money to request (KES).',
            example: 1.00
          },
          phoneNumber: {
            type: 'string',
            description: 'The customer phone number to receive the prompt. Can be formatted as 07..., 2547..., or +2547...',
            example: '254714747942'
          },
          reference: {
            type: 'string',
            description: 'Payment reference matching an invoice or order number (max 12 alphanumeric characters).',
            example: 'INV001'
          },
          description: {
            type: 'string',
            description: 'Description of payment (max 18 characters).',
            example: 'Tuition Payment'
          }
        }
      },
      STKQueryRequest: {
        type: 'object',
        required: ['checkoutRequestId'],
        properties: {
          checkoutRequestId: {
            type: 'string',
            description: 'The unique checkout request ID returned by Safaricom during STK push initiation.',
            example: 'ws_CO_16072026223540892'
          }
        }
      }
    }
  }
};

export default swaggerSpec;
