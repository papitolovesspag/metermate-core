// src/middlewares/authMid.js
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_hackathon_key';

export const requireAuth = (req, res, next) => {
  // 1. Get the token from the headers
  const authHeader = req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  // Extract the actual token string (removing "Bearer ")
  const token = authHeader.split(' ')[1];

  try {
    // 2. Verify the token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // 3. Attach the decoded user ID to the request object
    req.user = decoded; 
    
    // Move on to the actual controller logic
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
};