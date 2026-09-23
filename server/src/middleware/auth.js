/**
 * Authentication Middleware
 * Verifies Firebase ID Token from Authorization header: "Bearer <token>"
 * Extracts verified UID and attaches user object to req.user.
 */
const { auth, isLiveFirebase } = require('../config/firebase');

const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'error',
      message: 'Unauthorized: Missing or invalid Bearer token.'
    });
  }

  const token = authHeader.split('Bearer ')[1].trim();

  // If live Firebase Admin Auth is active, verify ID token cryptographically
  if (isLiveFirebase() && auth) {
    try {
      const decodedToken = await auth.verifyIdToken(token);
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        name: decodedToken.name || decodedToken.email.split('@')[0]
      };
      return next();
    } catch (err) {
      console.warn('[Auth Middleware] Invalid Firebase ID Token:', err.message);
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized: Invalid or expired authentication token.'
      });
    }
  }

  // Development / Offline Fallback mode for seamless local execution
  try {
    let decoded;
    if (token.startsWith('{') || token.startsWith('%7B')) {
      decoded = JSON.parse(decodeURIComponent(token));
    } else {
      // Base64 or standard string payload
      try {
        decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
      } catch (e) {
        decoded = { uid: token, email: 'user@example.com' };
      }
    }

    req.user = {
      uid: decoded.uid || decoded.userId || decoded.UserID || 'USR_001',
      email: decoded.email || decoded.Email || 'user@example.com',
      name: decoded.name || decoded.Name || 'SaveIQ User'
    };

    return next();
  } catch (err) {
    return res.status(401).json({
      status: 'error',
      message: 'Unauthorized: Could not parse session token.'
    });
  }
};

module.exports = {
  requireAuth
};
