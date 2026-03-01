export function timeout(ms) {
  return (req, res, next) => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        res.locals.error = 'Request timeout';
        res.status(504).json({ error: `Request timed out after ${ms}ms` });
      }
    }, ms);
    res.on('finish', () => clearTimeout(timer));
    res.on('close', () => clearTimeout(timer));
    next();
  };
}
