import jwt from "jsonwebtoken";


// export function authenticateToken(req, res, next) {
//   const authHeader = req.headers["authorization"];
//   const token = authHeader && authHeader.split(" ")[1]; // "Bearer <token>"
   
//   if (!token) {
//     return res.status(401).json({ message: "No token provided" });
//   }


//   jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
//     if (err) {
//       // 👇 Handle expiration cleanly so frontend can refresh
//       if (err.name === "TokenExpiredError") {
//         return res.status(401).json({ message: "Access token expired" });
//       }

//       // 👇 Log other issues only
//       console.error("JWT verification error:", err);
//       return res.status(403).json({ message: "Invalid token" });
//     }

//     req.user = user; // attach decoded user (id, role, etc.)
//     next();
//   });
// }

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
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access only" });
  }
  next();
}