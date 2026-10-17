/**
 * Express middleware for Zod schema validation
 * Validates req.body, req.query, and req.params against a Zod schema
 */
export const validate = (schema) => async (req, res, next) => {
  try {
    const parsed = await schema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    // Assign sanitized and validated values back to request.
    // Express 5: req.query and req.params are read-only getters on IncomingMessage —
    // direct assignment throws TypeError. Use Object.assign to mutate in place.
    if (parsed.body) req.body = parsed.body;
    if (parsed.query) Object.assign(req.query, parsed.query);
    if (parsed.params) Object.assign(req.params, parsed.params);

    next();
  } catch (error) {
    const issues = error.issues || error.errors;
    if (issues && Array.isArray(issues)) {
      const formattedErrors = issues.map((err) => ({
        field: err.path.join('.').replace(/^(body|query|params)\./, ''),
        location: err.path[0],
        message: err.message,
      }));

      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: formattedErrors,
      });
    }

    return res.status(400).json({
      success: false,
      error: 'Invalid Request Data',
      message: error.message,
    });
  }
};
