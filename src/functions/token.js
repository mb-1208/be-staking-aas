const jwt = require('jsonwebtoken');

function generateAccessToken(walletAddress) {
    return jwt.sign(walletAddress, process.env.TOKEN_SECRET, { expiresIn: '1800s' });
}

// Export the generateAccessToken function
module.exports = generateAccessToken;