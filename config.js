require('dotenv').config();

module.exports = {
    token: process.env.TOKEN || '',
    prefix: 'v!',
    ownerID: process.env.OWNER_ID || '',
};
