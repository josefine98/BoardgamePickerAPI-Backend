module.exports = (req, res, next) => {
    //this step isn't really necessary in our case, because we only have one role for the users - the admin role
    //but if we want to add more roles in the future, this will make it easier 

    //after authenticate, this is the next step in the request pipeline 
    //check if the role is allowed, if that's the case a "flag" will be set on req.account as authorised 

    const authorisedRole = 'admin'; // only the admin role is allowed to have access 

    try {
        // check if req.account exists if not throw error
        if (!req.account) throw { statusCode: 401, errorMessage: `Access denied: authentication required`, errorObj: {} }

        // check if req.account.role exists and if req.account.role.rolename is authorisedRole (admin)
        if (req.account.role && req.account.role.rolename == authorisedRole) {
            req.account.authorised = true;  // setting the "flag" (req.account.authorised) to true
            return next();
        }

        // move to the next function in the request pipeline
        return next()

    } catch (err) { // if error
        if (err.statusCode) {   // if error with statusCode, send error with status: statusCode 
            return res.status(err.statusCode).send(JSON.stringify(err));
        }
        return res.status(500).send(JSON.stringify(err));   // if no statusCode, send error with status: 500 (Internal Server Error)
    }
}