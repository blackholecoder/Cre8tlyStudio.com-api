import jwt from "jsonwebtoken";



export function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {

      


      if (err) {
        if (err.name === "TokenExpiredError") {
          res.setHeader("X-Auth-Status", "expired");
          return res.status(401).json({ message: "Access token expired" });
        }
        if (err.name === "JsonWebTokenError") {
          res.setHeader("X-Auth-Status", "malformed");
          return res.status(401).json({ message: "Malformed or missing token" });
        }

        console.error("JWT verification error:", err);
        res.setHeader("X-Auth-Status", "invalid");
        return res.status(403).json({ message: "Invalid token" });
      }

      req.user = user;
      next();
    });
  } catch (error) {
    console.error("JWT verification exception:", error);
    res.status(500).json({ message: "Authentication system error" });
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (req.user.role !== "admin" && req.user.role !== "superadmin") {
    return res.status(403).json({ message: "Admin or Super Admin access only" });
  }

  next();
}

export function requireMarketerOrAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (req.user.role === "admin" || req.user.role === "superadmin") {
    return next();
  }

  return res.status(403).json({ message: "Access denied" });
}

export function authOptional(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    // no token → just move on as guest
    req.user = null;
    return next();
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      req.user = null; // invalid token still treated as guest
    } else {
      req.user = user;
    }
    next();
  });
}

export function authenticateAdminToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];


  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  jwt.verify(token, process.env.ADMIN_JWT_SECRET, (err, user) => {
    if (err) {
      // Expired token → 401
      if (err.name === "TokenExpiredError") {
        res.setHeader("X-Auth-Status", "expired");
        return res.status(401).json({ message: "Access token expired" });
      }

      // Malformed token → 401
      if (err.name === "JsonWebTokenError") {
        res.setHeader("X-Auth-Status", "malformed");
        return res.status(401).json({ message: "Malformed or missing token" });
      }

      // ANY OTHER JWT ERROR → ALSO 401 (so refresh triggers)
      res.setHeader("X-Auth-Status", "invalid");
      return res.status(401).json({ message: "Invalid admin token" });
    }

    // Valid token, but bad role → still 403 (this is correct)
    if (!["admin", "superadmin", "marketer"].includes(user.role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    req.user = user;
    next();
  });
}






