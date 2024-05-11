const jwt = require('jsonwebtoken');




const REFRESH_TOKEN_EXPIRATION_THRESHOLD = 24 * 60 * 60;

function isTokenAboutToExpire(token) {
    const decoded = jwt.decode(token);
    const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds
    return decoded.exp - currentTime < REFRESH_TOKEN_EXPIRATION_THRESHOLD;
}


module.exports =
{
    isTokenAboutToExpire
}
