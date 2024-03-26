const crypto = require('crypto');

// Encrypt data
function encryptData(data, key) {
    const cipher = crypto.createCipheriv('aes-256-cbc', key);
    let encryptedData = cipher.update(data, 'utf8', 'hex');
    encryptedData += cipher.final('hex');
    return encryptedData;
}

// Decrypt data
function decryptData(encryptedData, key) {
    const decipher = crypto.createDecipheriv('aes-256-cbc', key);
    let decryptedData = decipher.update(encryptedData, 'hex', 'utf8');
    decryptedData += decipher.final('utf8');
    return decryptedData;
}

// Example usage
// const sensitiveData = 'Hello, world!';
// const encryptedData = encryptData(sensitiveData, key);
// console.log('Encrypted Data:', encryptedData);

// const decryptedData = decryptData(encryptedData, key);
// console.log('Decrypted Data:', decryptedData);