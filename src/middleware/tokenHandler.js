const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.status(401).json({
    "meta": {
      "code": res.statusCode,
      "status": 'Unauthorized',
      "message": "Access token is missing."
    },
    "data": null
  });

  jwt.verify(token, process.env.TOKEN_SECRET, (err, user) => {
    if (err) {
      console.error(err);
      return res.status(403).json({
        "meta": {
          "code": res.statusCode,
          "status": 'Forbidden',
          "message": "Access token is invalid or expired."
        },
        "data": null
      });
    }

    req.user = user;

    next();
  });
}

module.exports = authenticateToken;