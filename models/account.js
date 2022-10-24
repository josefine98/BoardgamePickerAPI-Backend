const sql = require("mssql"); // mssql module for managing connection/query with a mssql DB server
const config = require("config"); // config module for accessing the configuration (partially) defined in the environment
const con = config.get("dbConfig_UCN"); // using config to get the 'dbconfig_UCN' variable containing the connection string to the mssql DB server

const Joi = require("joi"); // joi module used for validation
const bcrypt = require("bcryptjs"); // bcryptjs module to handle the hashing and comparing of passwords

class Account {
  // the constructor gets called when a new object instance is created based on the class
  constructor(accountObj) {
    if (accountObj.accountid) {
      // check if accountid exists - as the id is assigned by the DB
      this.accountid = accountObj.accountid;
    }
    this.email = accountObj.email; // email is mandatory

    if (accountObj.role) {
      // role is mandatory, however, all new accounts created will be assigned a default role value by the DB
      this.role = {
        // if role exists, it MUST have a roleid
        roleid: accountObj.role.roleid,
      };
      if (accountObj.role.rolename) {
        // rolename is optional, that is mostly info for the frontend to identify what the roleid stands for
        this.role.rolename = accountObj.role.rolename;
      }
    }
  }

  //validation of the Account object
  //the schema must be the same structure as the object to be validated
  //by default only the specified properties are allowed to exist in the object
  //if something else is there the validate method will return an error
  static validationSchema() {
    const schema = Joi.object({
      accountid: Joi.number() //accountid has to be an integer and minimum 1
        .integer()
        .min(1),
      email: Joi.string() //the email is required, a string with type email and can be max 255 characters
        .email()
        .max(255)
        .required(),
      role: Joi.object({
        //role is an object
        roleid: Joi.number() //roleid is an integer, it is required and has to be at least 1
          .integer()
          .min(1)
          .required(),
        rolename: Joi.string() //rolename is a string with maximum 50 characters
          .max(50),
      }),
    });

    return schema;
  }

  // static validate(accountObj) returns the validation result, based on the validationSchema
  // if error the information will be in the error object, if no errors, then error object is undefined
  static validate(accountObj) {
    const schema = Account.validationSchema();

    return schema.validate(accountObj);
  }

  // validateCredentials for email/password
  // static validateCredentials(credentialsObj) returns the validation result for the credential object that consist of email and password
  static validateCredentials(credentialsObj) {
    const schema = Joi.object({
      email: Joi.string() //email is a string of the type email and it is required
        .email()
        .max(255)
        .required(),
      password: Joi.string() // password is a string of at least 3 characters and is required
        .min(3)
        .required(),
    });

    return schema.validate(credentialsObj);
  }

  // static checkCredentials(credentialsObj) returns a Promise
  // if succesful it resolves with account where account.email == credentialsObj.email
  // if unsuccessful it rejects with an error
  static checkCredentials(credentialsObj) {
    return new Promise((resolve, reject) => {
      (async () => {
        try {
          const account = await Account.readByEmail(credentialsObj.email); // calls Account.readByEmail with the credentials' email

          //connecting to the DB
          const pool = await sql.connect(con);
          const result = await pool
            .request() // need to find the (hashed)password information matching the accountid
            .input("accountid", sql.Int(), account.accountid) // setting up the accountid as SQL variable, the value is in the account object
            .query(`
                            SELECT *
                            FROM bgPassword p
                            WHERE p.FK_accountid = @accountid
                        `); // the bgPassword table has a FK_accountid column, we need the accountid

          // there should be only 1 result
          if (result.recordset.length != 1)
            throw {
              statusCode: 500,
              errorMessage: `Corrupt DB, corrupted password information on accountid: ${account.accountid}`,
              errorObj: {},
            };

          const hashedpassword = result.recordset[0].hashedpassword; // result.recordset[0] exists, because we have 1 result

          // verifying the password by using bcrypt to compare the stored hashed password to the raw password
          const credentialsOK = bcrypt.compareSync(
            credentialsObj.password,
            hashedpassword
          );
          // returns true if it matches, and if it returns false an error is thrown
          if (!credentialsOK)
            throw {
              statusCode: 401,
              errorMessage: `Invalid account email or password`,
              errorObj: {},
            };

          resolve(account); //resolve with account
        } catch (err) {
          reject(err); //reject with error
        }

        sql.close(); //closing the DB connection
      })();
    });
  }

  // static readByEmail(email) returns a Promise
  // if successful resolves with account, where account.email == email
  // if unsuccessful rejects with error
  static readByEmail(email) {
    return new Promise((resolve, reject) => {
      (async () => {
        try {
          const pool = await sql.connect(con); //opens DB connection
          const result = await pool
            .request() //sends request to the DB
            .input("email", sql.NVarChar(), email) // setting up email as SQL variable
            .query(`    
                            SELECT *
                            FROM bgAccount ac
                                INNER JOIN bgRole r
                                ON ac.FK_roleid = r.roleid
                            WHERE ac.email = @email
                        `);

          //we expect one result, if there is more or less an error is thrown
          if (result.recordset.length > 1)
            throw {
              statusCode: 500,
              errorMessage: `Corrupt DB, mulitple accounts with email: ${email}`,
              errorObj: {},
            };
          if (result.recordset.length == 0)
            throw {
              statusCode: 404,
              errorMessage: `Account not found by email: ${email}`,
              errorObj: {},
            };

          //converting the result into the format of an Account object
          const accountWannabe = {
            accountid: result.recordset[0].accountid,
            email: result.recordset[0].email,
            role: {
              roleid: result.recordset[0].roleid,
              rolename: result.recordset[0].rolename,
            },
          };

          // after restructuring the DB result into accountWannabe, it has to be validated
          const { error } = Account.validate(accountWannabe);
          if (error)
            throw {
              statusCode: 500,
              errorMessage: `Corrupt DB, account does not validate: ${accountWannabe.accountid}`,
              errorObj: error,
            };

          //if it validates, resolve with new Account object using the Account constructor
          resolve(new Account(accountWannabe));
        } catch (err) {
          reject(err); //reject the Promise
        }

        sql.close(); //closing the DB connection
      })();
    });
  }

  //static readById(accountid) returns a Promise
  //if successful resolves with account, where account.accountid == accountid
  //if unsuccessful rejects with error
  static readById(accountid) {
    return new Promise((resolve, reject) => {
      (async () => {
        try {
          const pool = await sql.connect(con); //opens DB connection
          const result = await pool
            .request() //query the account table joined role table, where accountid matches
            .input("accountid", sql.Int(), accountid) //setting up accountid as SQL variable
            .query(`    
                            SELECT *
                            FROM bgAccount ac
                                INNER JOIN bgRole r
                                ON ac.FK_roleid = r.roleid
                            WHERE ac.accountid = @accountid
                        `);

          //expect 1 result, if more or less an error is thrown
          if (result.recordset.length > 1)
            throw {
              statusCode: 500,
              errorMessage: `Corrupt DB, mulitple accounts with accountid: ${accountid}`,
              errorObj: {},
            };
          if (result.recordset.length == 0)
            throw {
              statusCode: 404,
              errorMessage: `Account not found by accountid: ${accountid}`,
              errorObj: {},
            };

          //need to convert the result.recordset into the format of Account object
          const accountWannabe = {
            accountid: result.recordset[0].accountid,
            email: result.recordset[0].email,
            role: {
              roleid: result.recordset[0].roleid,
              rolename: result.recordset[0].rolename,
            },
          };

          // after restructuring the DB result into the accountWannabe, it has to be validated
          const { error } = Account.validate(accountWannabe);
          if (error)
            throw {
              statusCode: 500,
              errorMessage: `Corrupt DB, account does not validate: ${accountWannabe.accountid}`,
              errorObj: error,
            };

          resolve(new Account(accountWannabe)); //resolve with a new Account object
        } catch (err) {
          reject(err); //reject with error
        }

        sql.close(); //closes DB connection
      })();
    });
  }

  // static readById(queryObj) returns a Promise
  //if successful - resolves with all accounts, where "queryObj.query" == "queryObj.value" (if no queryObj, returns with all)
  //      if unsuccessful - rejects with error
  //  queryObj: { query, value }
  //      query: 'email' or 'roleid' (see API def document)
  //      value: an email or a roleid - depending on query
  static readAll(queryObj) {
    return new Promise((resolve, reject) => {
      (async () => {
        try {
          // preparing query string
          let queryString = `
                        SELECT *
                        FROM bgAccount ac
                            INNER JOIN bgRole r
                            ON ac.FK_roleid = r.roleid
                    `;

          let qcolumnname;
          let qtype;
          if (queryObj) {
            switch (queryObj.query) {
              case "email":
                qcolumnname = "email"; //if the query asks for an email it's type is a string
                qtype = sql.NVarChar();
                break;
              case "roleid":
                qcolumnname = "FK_roleid"; //if the query asks for a roleid it's type is an integer
                qtype = sql.Int();
                break;
              default:
                break;
            }

            queryString += `
                            WHERE ac.${qcolumnname} = @var
                        `; // 'qcolumnname' is the name of the column in the bgAccount
            // using 'var' as the sql variable name, will need to setup the input with that name below
          }

          const pool = await sql.connect(con); //open connection to DB

          //query the DB
          let result;
          if (queryObj) {
            //if there is a queryObj
            result = await pool
              .request()
              .input("var", qtype, queryObj.value) //the WHERE clause needs an input, calling it 'var' and giving it qtype
              .query(queryString); //this queryString is with a WHERE clause
          } else {
            result = await pool.request().query(queryString); //if there is no queryObj and the queryString has no WHERE clause
          }

          // restructure the result and validate inside the forEach loop
          // the result table has one row per account
          const accounts = [];
          result.recordset.forEach((record) => {
            // need to convert the record into the format of Account object
            const accountWannabe = {
              accountid: record.accountid,
              email: record.email,
              role: {
                roleid: record.roleid,
                rolename: record.rolename,
              },
            };

            // after restructuring the record into the accountWannabe object, it has to be validated
            const { error } = Account.validate(accountWannabe);
            if (error)
              throw {
                statusCode: 500,
                errorMessage: `Corrupt DB, account does not validate: ${accountWannabe.accountid}`,
                errorObj: error,
              };

            //if it validates, push the account into the accounts array
            accounts.push(new Account(accountWannabe));
          });

          // resolve with accounts array
          resolve(accounts);
        } catch (err) {
          reject(err); //reject with error
        }

        sql.close(); //close the DB connection
      })();
    });
  }

  //create(password) returns a Promise
  //tries to create a password for an account
  //if successful - resolve with account
  //if unsuccessful - rejects with error
  create(password) {
    return new Promise((resolve, reject) => {
      (async () => {

        //before a new account can be created, check if it already exists (if the email has been used to create another account)
        try {
          const account = await Account.readByEmail(this.email); // success means there IS ALREADY an account with the email

          //which is an error in this case
          //reject with error 409 and returns Promise
          const error = {
            statusCode: 409,
            errorMessage: `Account already exists`,
            errorObj: {},
          };
          return reject(error); //reject with error

        } catch (err) { //if readByEmail returns an error
          //if the error statusCode doesn't exist or is not 404 (meaning account does not exist, which is good), it is an actual error 
          if (!err.statusCode || err.statusCode != 404) {
            return reject(err); // reject with error and the Promise is returned
          }
        }

        try {
            //at this point we are certain there is no errors
          const pool = await sql.connect(con); // await opening connection to the DB

          const resultAccount =
            await pool
              .request() // query the DB bgAccount table
              .input("email", sql.NVarChar(), this.email) // setting up email as SQL variable, info is in this.email
              .query(`
                            INSERT INTO bgAccount
                                ([email])
                            VALUES
                                (@email);
                            SELECT *
                            FROM bgAccount ac
                            WHERE ac.accountid = SCOPE_IDENTITY()
                        `); //inserts account into the bgAccount table and selects the table row with the new account (with no password yet)

          // check if we have exactly 1 new line inserted
          // in any other case than 1 record in resultAccount.recordset, an error is thrown
          if (resultAccount.recordset.length != 1)
            throw {
              statusCode: 500,
              errorMessage: `INSERT INTO account table failed`,
              errorObj: {},
            };


          // inserting the hashed password into the bgPassword table using bcrypt
          const hashedpassword = bcrypt.hashSync(password); //creates a hashedpassword from the raw password from the input parameter 
          const accountid = resultAccount.recordset[0].accountid; // the newly inserted account's accountid - resultAccount.recordset[0] exists because there is 1 record resultAccount.recordset

          const resultPassword = await pool
            .request() // query the bgPassword table
            .input("accountid", sql.Int(), accountid) // setting up accountid as SQL variable
            .input("hashedpassword", sql.NVarChar(), hashedpassword) // setting up hashedpassword as SQL variable
            .query(`
                            INSERT INTO bgPassword
                                ([FK_accountid], [hashedpassword])
                            VALUES
                                (@accountid, @hashedpassword);
                            SELECT *
                            FROM bgPassword p
                            WHERE p.FK_accountid = @accountid
                        `); //inserts the foreign key accountid and password into the bgPassword table and selects the newly inserted row

          // check to see if we have exactly 1 new line inserted, if not an error is thrown
          if (resultPassword.recordset.length != 1)
            throw {
              statusCode: 500,
              errorMessage: `INSERT INTO account table failed`,
              errorObj: {},
            };

          sql.close(); //closing the DB connection

          const account = await Account.readByEmail(this.email); // awaiting the result of readByEmail - this method opens the DB itself
          // on success, we have account in the format we need it in, because readByEmail resolves with the account 

          resolve(account); // resolve with account

        } catch (err) {
          reject(err); //reject with error
        }

        sql.close(); //closing the DB connection, in case the sql.close() never happens in the try block (no error if already closed)
      })(); 
    });
  }


  //update() returns a Promise
  //updates the account roleid
  //if successful - resolve with account
  //if unsuccessful - rejects with error
  update() {
    return new Promise((resolve, reject) => {
      (async () => {
        try {
          let tmpResult;
          tmpResult = await Account.readById(this.accountid); // call Account.readById(this.accountid) to ensure the account exists

          const pool = await sql.connect(con); //opens connection to DB
          tmpResult = await pool
            .request() // query DB to update account where the id's match
            .input("accountid", sql.Int(), this.accountid) // setting up accountid as SQL variable, for the WHERE clause
            .input("roleid", sql.Int(), this.role.roleid) // setting up roleid as SQL variable
            .query(`
                        UPDATE bgAccount
                        SET FK_roleid = @roleid
                        WHERE accountid = @accountid
                    `); // neither accountid nor email may be updated

          sql.close(); //closing the DB connection

          const account = await Account.readById(this.accountid); // call Account readById(this.accountid) with the updated information

          resolve(account); //resolve with account
        } catch (err) {
            reject(err);  //reject with error
        }

        sql.close(); //closing the DB connection
      })(); 
    });
  }


  //updatePassword() returns a Promise
  //updates the accounts password
  //if successful - resolve with account
  //if unsuccessful - rejects with error
  updatePassword(password) {
    return new Promise((resolve, reject) => {
      (async () => {

        try {
          let tmpResult;
          const account = await Account.readById(this.accountid); // call Account.readById(this.accountid) to make sure it exists

          const hashedpassword = bcrypt.hashSync(password); // generate hashed password with bcrypt

          const pool = await sql.connect(con); //opening connection to DB
          tmpResult = await pool
            .request() // query bgPassword with UPDATE WHERE FK_accountid = accountid
            .input("accountid", sql.Int(), this.accountid)
            .input("hash", sql.NVarChar(), hashedpassword).query(`
                            UPDATE bgPassword
                            SET hashedpassword = @hash
                            WHERE FK_accountid = @accountid
                        `);

          resolve(account); // resolve with account
        } catch (err) {
          reject(err); // reject with error
        }

        sql.close(); //closing the DB connection
      })();
    });
  }


  //delete() returns a Promise
  //updates the accounts password
  //if successful - resolve with account
  //if unsuccessful - rejects with error
  delete() {
    return new Promise((resolve, reject) => {
      (async () => {
        try {
          
          const account = await Account.readById(this.accountid); //calling Account.readById(this.accountid) to make sure the account exists

          let tmpResult;
          const pool = await sql.connect(con); //opening connection to the DB
          tmpResult = await pool
            .request() 
            .input("accountid", sql.Int(), this.accountid).query(`
                            DELETE FROM bgPassword
                            WHERE FK_accountid = @accountid
                        `); //deletes account from the bgPassword table where FK_accountid = accountid 
          tmpResult = await pool
            .request() 
            .input("accountid", sql.Int(), this.accountid).query(`
                            DELETE FROM bgAccount
                            WHERE accountid = @accountid
                        `); //deletes account from the bgAccount table where accountid = accountid 

          resolve(account); // resolve with account
        } catch (err) {
          reject(err); // reject with error
        }

        sql.close(); //closing the DB connection
      })(); 
    });
  }
}

module.exports = Account; //exports Account class so it can be accessed in other files - source: https://stackify.com/node-js-module-exports/
