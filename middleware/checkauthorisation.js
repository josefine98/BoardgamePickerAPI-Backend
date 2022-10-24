module.exports = (req, res, next) => {
    // if authorised flag exists next() is called automaically otherwise there is an error

    try {
        // check if the authorised flag exists, if it does then move along 
        if (req.account.authorised) return next();

        // reaching this point, can conclude that the account is not authorised
        throw { statusCode: 401, errorMessage: `Access denied: authorisation failed`, errorObj: {} }

    } catch (err) { // if error
        if (err.statusCode) {   // if error with statusCode, send error with status: statusCode 
            return res.status(err.statusCode).send(JSON.stringify(err));
        }
        return res.status(500).send(JSON.stringify(err));   // if no statusCode, send error with status: 500 (Internal Server Error)

    }
}