const crypto = require('crypto');

const generateOtp = () => {
  const code = (Math.floor(100000 + Math.random() * 900000)).toString(); // 6 digits
  const hash = crypto.createHash('sha256').update(code).digest('hex');
  const ttl = parseInt(process.env.OTP_TTL_MINUTES || '1', 10);
  const expires = new Date(Date.now() + ttl * 60 * 1000);
  return { code, hash, expires };
};

const verifyOtp = (input, storedHash, expires) => {
  if (!storedHash || !expires) return false;
  if (new Date() > new Date(expires)) return false;
  const inputHash = crypto.createHash('sha256').update(input).digest('hex');
  return inputHash === storedHash;
};

module.exports = { generateOtp, verifyOtp };
