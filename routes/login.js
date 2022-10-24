const express = require('express'); //express is used to create the API and helps handle routing and middleware - source: https://www.simplilearn.com/tutorials/nodejs-tutorial/what-is-express-js 
const router = express.Router(); //creates new Router object using express - used to create router objects to handle requests - source: https://www.geeksforgeeks.org/express-js-express-router-function/ 

const jwt = require('jsonwebtoken'); //jsonwebtoken will be used to generate the authentication token
const config = require('config'); //config has access to the configuration variables based on the environment

//the secret key is defined in the environment, only the server's environment may know what it is
//the secret key is used for encrypting/decrypting the token
const jwtKey = config.get('jwt_secret_key'); 

const Account = require('../models/account'); //requiring the Account class, so it's methods can be used here

//POST /api/accounts/login
//payload: {email, password}
router.post('/', async (req, res) => {  
    try {
        const { error } = Account.validateCredentials(req.body); //validate req.body using the Account class's validateCredentials(email, password) method
        if (error) throw { statusCode: 400, errorMessage: 'Badly formatted request', errorObj: error }
        
        const account = await Account.checkCredentials(req.body); //if error is not thrown above, set account as req.body

        const token = jwt.sign(JSON.stringify(account), jwtKey); // the account object is turned into a string, the string gets encrypted with the secret key using jwt

        res.header('x-authentication-token', token); //attaching the token to the header, as key - value pair: 'x-authentication-token': token

        return res.send(JSON.stringify(account)); //responding with account in response body (token is in the response header)

    } catch (err) {
        // if (err.statusCode == 400) is to inform the client that the REQUEST was wrong (email was missing or malformed)
        if (err.statusCode == 400) return res.status(err.statusCode).send(JSON.stringify(err));

        const standardError = { statusCode: 401, errorMessage: `Invalid account email or password`, errorObj: {} }
        return res.status(401).send(JSON.stringify(standardError)); //if anything (other than bad request) went wrong, send a standard error message
    }

})

module.exports = router; //router object is exported from this 'module' to be seen in other modules when using the command 'require'