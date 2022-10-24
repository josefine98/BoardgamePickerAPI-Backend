const jwt = require('jsonwebtoken'); //used for authentication - a json web token is assigned to the user when they sign in - source: https://www.simplilearn.com/tutorials/nodejs-tutorial/jwt-authentication  
const config = require('config'); //config is used to get the environment variables defined in the custom-environment-variables.json file 
const jwtKey = config.get('jwt_secret_key'); // get the environment variable jwt_secret_key with the use of config in order to decrypt the token

module.exports = (req, res, next) => { 
    // Trying to get the account from the token and attach it to the request object

    try {
        // check if token is in 'x-authentication-token' request header
        const token = req.header('x-authentication-token');
        // if there is no token then throw error
        if (!token) throw { statusCode: 401, errorMessage: `Access denied: no token provided`, errorObj: {} }

        // decrypt the token to get the account, if the verification fails jsonwebtoken throws an error
        const account = jwt.verify(token, jwtKey);  

        // attach the account to the request object
        req.account = account;

        // move to the next() in the request pipeline
        next();

    } catch (err) { // if error
        if (err.name == 'JsonWebTokenError') {  // if this is a jwt verification error thrown in line 19
            return res.status(401).send(JSON.stringify({ statusCode: 401, errorMessage: `Access denied: invalid token`, errorObj: {} }));
        }
        if (err.statusCode) {   // if error with statusCode, send error with status: statusCode 
            return res.status(err.statusCode).send(JSON.stringify(err));
        }
        return res.status(500).send(JSON.stringify(err));   // if no statusCode, send error with status: 500 (internal Server Error)
    }
}