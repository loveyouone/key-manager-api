export default function apiAuth(req, res, next) {
  const apiSecret = req.headers['x-api-secret'];
  if (!apiSecret || apiSecret !== process.env.API_SECRET) {
    console.warn(`非法访问尝试: ${req.ip}`);
    return res.status(403).json({ 
      error: 'Forbidden',
      code: 'INVALID_API_KEY'
    });
  }
  next();
}
