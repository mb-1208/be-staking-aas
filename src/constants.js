const SECRET_KEY = '75bce6cdd30feb719dc5b3dc3d6f93d786436f6f'; //sha-1 of "ignity.pesonalensa"

module.exports = {
    SECRET_KEY,
    jwtSecret: 'your_jwt_secret_key', // Secret key for signing JWTs
    jwtExpiration: 3600 // Expiration time in seconds (1 hour)
};