export function logger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const entry = {
      timestamp: new Date().toISOString(),
      method: req.method,
      route: req.originalUrl,
      status: res.statusCode,
      duration_ms: duration,
    };
    if (res.locals.error) {
      entry.error = res.locals.error;
    }
    console.log(JSON.stringify(entry));
  });
  next();
}
