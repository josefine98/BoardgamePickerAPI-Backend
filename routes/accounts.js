const express = require('express'); //express is used to create the API and helps handle routing and middleware - source: https://www.simplilearn.com/tutorials/nodejs-tutorial/what-is-express-js 
const router = express.Router(); //creates new Router object using express - used to create router objects to handle requests - source: https://www.geeksforgeeks.org/express-js-express-router-function/ 

const _ = require('lodash'); //library to help simplify working with strings, numbers, arrays, functions and objects in JS - source: https://zetcode.com/javascript/lodash/ 

const Account = require('../models/account'); //requiring the Account class 
const Joi = require('joi'); //Joi is used for validation 


//requiring middleware functions used to protect endpoints
const auth = require('../middleware/authenticate'); 
const admin = require('../middleware/admin');
const check = require('../middleware/checkauthorisation');  

//GET [auth, admin, check] /api/accounts/
//GET request endpoint for accounts using middleware to make sure the user is authorized to see the endpoint
router.get('/', [auth, admin, check], async (req, res) => {

    try {
        //validation schema using Joi
        // email and role are both optional, req.query may be an empty object
        const schema = Joi.object({
            email: Joi.string() //email has to be a string of the type email
                .email(),
            roleid: Joi.number() //roleid has to be an integer of at least 1
                .integer()
                .min(1)
        });  
        
        const { error } = schema.validate(req.query); // validating the query parameters (req.query) and throwing error if it doesn't validate
        if (error) throw { statusCode: 400, errorMessage: `Badly formatted request`, errorObj: error }

        // based on query parameters, call Account.readAll(queryObj)
        let accounts;
        if (req.query.email) accounts = await Account.readAll({ query: 'email', value: req.query.email });  // email is specified, role is ignored if any
        if (req.query.roleid && !req.query.email) accounts = await Account.readAll({ query: 'roleid', value: req.query.roleid });   // role is specified, but no email
        if (!req.query.roleid && !req.query.email) accounts = await Account.readAll();  // neither email nor role specified

        // respond with accounts
        return res.send(JSON.stringify(accounts));

    } catch (err) { 
        if (err.statusCode) { // if error with statusCode, send error with status: statusCode 
            return res.status(err.statusCode).send(JSON.stringify(err));
        }
        return res.status(500).send(JSON.stringify(err)); // if no statusCode, send error with status: 500
    }
})

//GET [auth] /api/accounts/own
router.get('/own', [auth], async (req, res) => {
    //the /own endpoints take the accountid from the authentication token, that was processed by the authentication middleware
    //the account information can be found attached to the request in req.account

    try {
        // call Account.readById(req.account.accountid)
        const account = await Account.readById(req.account.accountid);

        // respond with account
        return res.send(JSON.stringify(account));

    } catch (err) { 
        if (err.statusCode) {   // if error with statusCode, send error with status: statusCode 
            return res.status(err.statusCode).send(JSON.stringify(err));
        }
        return res.status(500).send(JSON.stringify(err)); //if no statusCode, send error with status: 500
    }

})

// GET [auth, admin, check] /api/accounts/:accountid
router.get('/:accountid', [auth, admin, check], async (req, res) => {
    // validate accountid (in req.params object) - it is a request parameter, but it is considered user input 

    try {
        //validate accountid
        const schema = Joi.object({
            accountid: Joi.number() //accountid is required and an integer that is minimum 1
                .integer()
                .min(1)
                .required()
        });  

        const { error } = schema.validate(req.params); 
        if (error) throw { statusCode: 400, errorMessage: `Badly formatted request`, errorObj: error }

        // call Account.readById(accountid) with the request parameters found in req.params
        const account = await Account.readById(req.params.accountid);

        // respond with account
        return res.send(JSON.stringify(account));

    } catch (err) { 
        if (err.statusCode) {   // if error with statusCode, send error with status: statusCode 
            return res.status(err.statusCode).send(JSON.stringify(err));
        }
        return res.status(500).send(JSON.stringify(err));   // if no statusCode, send error with status: 500
    }
})


// POST /api/accounts
router.post('/', async (req, res) => {
    try {
        // separate the account's email from the req.body, using lodash's pick() function
        //  _.pick(object, [properties]) returns a copy of the object with only those properties you have "picked"
        const accountWannabe = _.pick(req.body, ['email']);
        // separate the password from the req.body
        const passwordWannabe = _.pick(req.body, ['password']);

        // check the raw password
        const schema = Joi.object({     
            password: Joi.string()      //password is required and has to be a string that is minimum 3 characters long
                .min(3)              
                .required()            
        });

        let validationResult = schema.validate(passwordWannabe); // validating the raw password

        if (validationResult.error) throw { statusCode: 400, errorMessage: `Password does not match requirements`, errorObj: validationResult.error }

        validationResult = Account.validate(accountWannabe);    // validating the account information using the Account class's validate function 
        if (validationResult.error) throw { statusCode: 400, errorMessage: `Badly formatted request`, errorObj: validationResult.error }

        const accountToBeSaved = new Account(accountWannabe);   // calling the Account class' constructor with the info in accountWannabe

        const account = await accountToBeSaved.create(passwordWannabe.password); //waiting for accountToBeSaved to be created in the DB and then calling create(password)   

        // respond with account
        return res.send(JSON.stringify(account));

    } catch (err) {     // if error, responde with error
        if (err.statusCode) { // if the error info is formatted by us, there is a fitting statusCode
            return res.status(err.statusCode).send(JSON.stringify(err));
        }
        return res.status(500).send(JSON.stringify(err)); // if not, send  generic 'Internal server error' code 500 in the error response
    }
})



// PUT [auth] /api/accounts/own
// the /own endpoints take the accountid from the authentication token, that was processed by the authentication middleware
// the account information can be found attached to teh request in req.account
router.put('/own', [auth], async (req, res) => {
    try {
        //call Account.readById(accountid) which can be found in req.account.accountid
        const accountCurrent = await Account.readById(req.account.accountid);
        
        //validate the modified accountCurrent and throw error if it doesn't validate
        let validationResult = Account.validate(accountCurrent);
        if (validationResult.error) throw { statusCode: 400, errorMessage: `Badly formatted request`, errorObj: validationResult.error }

        //if validated, update the account in the DB
        const account = await accountCurrent.update();


        //if password needs changing, call account.updatePassword(password)
        if (req.body.password) {
            // check the raw password
            const passwordWannabe = _.pick(req.body, ['password']);
            //schema from POST /api/accounts 
            const schema = Joi.object({                    
                password: Joi.string()      //password is a required string of minimum 3 characters
                    .min(3)                 
                    .required()             
            });

            validationResult = schema.validate(passwordWannabe); //validating the raw password to match the password needs
            if (validationResult.error) throw { statusCode: 400, errorMessage: `Password does not match requirements`, errorObj: validationResult.error }

            //calling updatePassword(password) if it validates
            const accountSame = await account.updatePassword(passwordWannabe.password);
        }

        //respond with account
        return res.send(JSON.stringify(account));

    } catch (err) { // if error
        if (err.statusCode) { // if error with statusCode, send error with status: statusCode 
            return res.status(err.statusCode).send(JSON.stringify(err));
        }
        return res.status(500).send(JSON.stringify(err)); // if no statusCode, send error with status: 500
    }
})

// DELETE [auth, admin, check] /api/accounts/:accountid
router.delete('/:accountid', [auth, admin, check], async (req, res) => {
    try {
        // validate accountid
        const schema = Joi.object({
            accountid: Joi.number() //is a required integer that has to be minimum 1
                .integer()
                .min(1)
                .required()
        });

        const { error } = schema.validate(req.params);
        if (error) throw { statusCode: 400, errorMessage: `Badly formatted request`, errorObj: error }

        //check if req.account.accountid == req.params.accountid, throw error if not, the user is not allowed to delete own account
        if (req.account.accountid == req.params.accountid) throw { statusCode: 403, errorMessage: `Request denied: cannot delete account`, errorObj: {} }

        //if not, call Account.readById(req.params.accountid)
        const account = await Account.readById(req.params.accountid);

        //call account.delete()
        const deletedAccount = await account.delete();

        //respond with deletedAccount
        return res.send(JSON.stringify(deletedAccount));

    } catch (err) { //if error
        if (err.statusCode) {   //if error with statusCode, send error with status: statusCode 
            return res.status(err.statusCode).send(JSON.stringify(err));
        }
        return res.status(500).send(JSON.stringify(err)); //if no statusCode, send error with status: 500
    }
})

module.exports = router; // router object is exported from this 'module' to be seen in other modules when using the command 'require'