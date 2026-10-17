import { sanitizeLog, isTransientRpcError, getRetryAfterSeconds } from '../config/arkiv.js';

/**
 * Global Error Handler Middleware
 */
export const notFoundHandler = (req, res, _) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
};

export const errorHandler = (err, req, res, _) => {
  // Sanitize stack trace and error message to prevent leaking private keys
  const sanitizedStack = sanitizeLog(err.stack || err.message);
  console.error('[Error Handler] Request Error:', sanitizedStack);

  const rawMessage = err.message || 'An unexpected internal error occurred';
  const errorMessage = sanitizeLog(rawMessage);

  // 1. Handle Arkiv RPC timeouts and service unavailability (HTTP 503)
  if (
    err.code === 'ARKIV_RPC_UNAVAILABLE' ||
    err.name === 'ArkivRpcUnavailableError' ||
    err.name === 'TimeoutError' ||
    isTransientRpcError(err)
  ) {
    return res.status(503).json({
      success: false,
      error: 'Service Unavailable',
      code: 'ARKIV_RPC_UNAVAILABLE',
      message: 'Arkiv Tiramisu RPC is temporarily unavailable or timed out. Please try again shortly.',
      details: errorMessage,
    });
  }

  // 1b. Handle Arkiv RPC rate limits (HTTP 429) without retrying.
  if (err.code === 'ARKIV_RPC_RATE_LIMITED' || err.name === 'ArkivRateLimitedError') {
    const retryAfterSeconds = err.retryAfterSeconds || getRetryAfterSeconds(err);
    if (retryAfterSeconds) {
      res.setHeader('Retry-After', String(retryAfterSeconds));
    }

    return res.status(429).json({
      success: false,
      error: 'Rate Limited',
      code: 'ARKIV_RPC_RATE_LIMITED',
      message: 'Arkiv Tiramisu RPC rate limit reached. Please retry after the indicated delay.',
      ...(retryAfterSeconds ? { retryAfterSeconds } : {}),
      details: errorMessage,
    });
  }

  // 2. Handle insufficient gas balance on Arkiv Tiramisu
  if (errorMessage.includes('insufficient funds') || errorMessage.includes('0 GLM balance')) {
    return res.status(402).json({
      success: false,
      error: 'Insufficient Gas Funds',
      message: errorMessage,
      faucetUrl: 'https://hub.arkiv.network/faucet',
    });
  }

  // 3. Handle entity not found
  if (errorMessage.includes('No live entity has that key') || err.name === 'NoEntityFoundError') {
    return res.status(404).json({
      success: false,
      error: 'Entity Not Found',
      message: errorMessage,
    });
  }

  // 4. Handle invalid Arkiv values / attribute names
  if (err.name === 'InvalidValueError' || err.name === 'InvalidAttributeNameError') {
    return res.status(400).json({
      success: false,
      error: 'Invalid Arkiv Data',
      message: errorMessage,
    });
  }

  const statusCode = err.statusCode || err.status || 500;
  return res.status(statusCode).json({
    success: false,
    error: err.name || 'Internal Server Error',
    message: errorMessage,
    ...(process.env.NODE_ENV === 'development' && { stack: sanitizedStack }),
  });
};
