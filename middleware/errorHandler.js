module.exports = (error, req, res, next) => {
  if (res.headersSent) return next(error);
  const status = error.statusCode || 502;
  if (status >= 500 || status === 401) {
    // Keep diagnostics useful without logging search terms, headers, or credentials.
    console.error(JSON.stringify({
      event: 'request_failed',
      requestId: String(req.get?.('x-request-id') || '').slice(0, 80) || undefined,
      method: req.method,
      path: req.path,
      status,
      error: error.name || 'Error',
      code: typeof error.code === 'string' ? error.code : typeof error.cause?.code === 'string' ? error.cause.code : undefined,
      // Messages are capped and URLs/secrets removed; never log request query values.
      detail: String(error.message || '').replace(/https?:\/\/[^\s]+/gi, '[url]')
        .replace(/(password|token|secret|api[_-]?key)=([^\s&]+)/gi, '$1=[redacted]').slice(0, 160) || undefined
    }));
  }
  if (status === 429 || status === 503) res.set('Retry-After', '60');
  res.status(status).json({ code: status === 429 ? 'source_budget_exhausted' : status === 404 ? 'not_found' : status === 400 ? 'validation_error' : 'source_unavailable', message: status < 500 ? error.message : 'Source unavailable; please retry.', retryable: status >= 500 || status === 429 });
};
