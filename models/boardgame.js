const Joi = require("joi"); // joi module used for validation
const sql = require("mssql"); // mssql module for managing connection/query with a mssql DB server

const config = require("config"); // config module for accessing the configuration (partially) defined in the environment
const con = config.get("dbConfig_UCN"); // using config to get the 'dbconfig_UCN' variable containing the connection string to the mssql DB server

const _ = require("lodash"); //library to help simplify working with strings, numbers, arrays, functions and objects in JS - source: https://zetcode.com/javascript/lodash/
const Category = require("./category"); // we require Category since we need to validate the categories for the boardgames

class Boardgame {
  // the constructor gets called when a new object instance is created based on the class
  constructor(boardgameObj) {
    if (boardgameObj.boardgameid) {
      // check if accountid exists - as the id is assigned by the DB
      this.boardgameid = boardgameObj.boardgameid;
    }
    this.title = boardgameObj.title; // title is mandatory
    if (boardgameObj.imageurl) {
      // imageurl is optional so check if it exists
      this.imageurl = boardgameObj.imageurl;
    }
    this.bgdescription = boardgameObj.bgdescription; // description is mandatory
    this.minplayers = boardgameObj.minplayers; // minplayers is mandatory
    this.maxplayers = boardgameObj.maxplayers; // minplayers is mandatory
    this.mintime = boardgameObj.mintime; // minplayers is mandatory
    this.maxtime = boardgameObj.maxtime; // minplayers is mandatory
    this.minage = boardgameObj.minage; // minplayers is mandatory
    this.categories = _.cloneDeep(boardgameObj.categories); // categories is an array of objects so we need to use cloneDeep to recursively clone the value
  }

  //validation of the boardgame object
  //the schema must be the same structure as the object to be validated
  //by default only the specified properties are allowed to exist in the object
  //if something else is there the validate method will return an error
  static validationSchema() {
    const schema = Joi.object({
      boardgameid: Joi.number().integer().min(1), // boardgameid needs to be an integer and minimum 1
      title: Joi.string().max(100).required(), // title needs to be a string of maximum 100 characters and is required
      imageurl: Joi.string().uri().max(255).allow(null), // imageurl needs to be a string of the type uri and maximum 255 characters and is required
      bgdescription: Joi.string().max(500).required(), // description needs to be a string of maximum 500 characters and is required
      minplayers: Joi.number().integer().min(1).required(), // minplayers needs to be an integer and minmum 1 and is required
      maxplayers: Joi.number().integer().min(1).required(), // maxplayers needs to be an integer and minimum 1 and is required
      mintime: Joi.number().integer().min(1).required(), // mintime needs to be an integer and minimum 1 and is required
      maxtime: Joi.number().integer().min(1).required(), // maxtime needs to be an integer and minimum 1 and is required
      minage: Joi.number().integer().min(1).required(), // minage needs to be an integer and minimum 1 and is required
      categories: Joi.array().items(Category.validationSchema()), // categories is an array of objects that is being validated through the Category class
    });

    return schema;
  }

  static validate(boardgameObj) {
    const schema = Boardgame.validationSchema();

    return schema.validate(boardgameObj);
  }

  // static readAllFromQueries(categoryQuery, playersQuery, timeQuery, minageQuery) has queries for each possible filter as parameters 
  // (the queries we call this function with have a default value as true which makes it possible to use this function with no query as well)
  // static readAllFromQueries(categoryQuery, playersQuery, timeQuery, minageQuery) returns a promise
  // if successful it resolves with an array of boardgame objects
  // if unsuccessful it rejects with an error
  static readAllFromQueries(categoryQuery, playersQuery, timeQuery, minageQuery) {
    return new Promise((resolve, reject) => {
      (async () => {
        try {
          const pool = await sql.connect(con); // connecting to the DB
          const result = await //QUERY EXPLANATION:
          //The first part of the query joins the boardgame table and category table with help from the
          //bgCategory table, where the id's match
          //WHERE the boardgame id exists in the table generated in the subquery/second select:
          //joins the same as above, but only selects the boardgameid
          //WHERE all the queries match - so matches the search
          //we get a list of boardgame id's from the inner select query that matches the search
          //and then in the outer select we select all information about those selected games

          //so essentially:
          //inner: selects WHICH games -> but only one instance of that game
          //outer: selects what information to show about those games -> and all instances of each game,
          //so the rest of the function still works --> and we get an array of all categories for each game

          //if we don't find the games first and then select all the information about them,
          //we would only get the instances of the games, that matches the search
          //meaning the array of categories would be incomplete and only contain the exact categories
          //we are searching for
          //IN: https://www.dofactory.com/sql/where-in

          pool.request().query(`
                        SELECT *
                        FROM bgBoardgame bg
                            INNER JOIN bgBoardgameCategory bgc
                            ON bg.boardgameid = bgc.FK_boardgameid
                        INNER JOIN bgCategory c
                        ON bgc.FK_categoryid = c.categoryid
                        WHERE boardgameid IN ( SELECT boardgameid
                                                FROM bgBoardgame bg
                                                    INNER JOIN bgBoardgameCategory bgc
                                                    ON bg.boardgameid = bgc.FK_boardgameid
                                                INNER JOIN bgCategory c
                                                ON bgc.FK_categoryid = c.categoryid
                                                WHERE (${categoryQuery}) AND ${playersQuery} AND ${timeQuery} AND ${minageQuery}) 
                        `);


          // if a boardgame has multiple categories, the boardgame will be in the result.recordset more than once
          // we want to create a boardgame object with an array of categories as objects            
          // therefore we begin to restructure with this in mind
          const boardgameBinder = []; // assigns with an empty array
          let binderLastIndex = -1; //because the first index is 0, and we need to increment it
          
          result.recordset.forEach((record) => { 
            if (!boardgameBinder[binderLastIndex] || 
              record.boardgameid != boardgameBinder[binderLastIndex].boardgameid 
            ) {
              //add new Boardgame
              const newBoardgame = {
                boardgameid: record.boardgameid,
                title: record.title,
                imageurl: record.imageurl,
                bgdescription: record.bgdescription,
                minplayers: record.minplayers,
                maxplayers: record.maxplayers,
                mintime: record.mintime,
                maxtime: record.maxtime,
                minage: record.minage,
                categories: [
                  {
                    categoryid: record.categoryid,
                    categoryname: record.categoryname,
                  },
                ],
              };
              boardgameBinder.push(newBoardgame);
              binderLastIndex++;
            } else {
              //add new category to the existing last added boardgame
              const newCategory = {
                categoryid: record.categoryid,
                categoryname: record.categoryname,
              };

              // add the new category to the boardgame in the boardgameBinder array
              boardgameBinder[binderLastIndex].categories.push(newCategory);
            }
          });

          // we need to validate each boardgame in the boardgameBinder
          const boardgames = [];
          boardgameBinder.forEach((boardgame) => {
            const { error } = Boardgame.validate(boardgame);
            if (error)
              throw {
                statusCode: 500,
                errorMessage: `Corrupt boardgame information in the database, boardgameid: ${boardgame.boardgameid}`,
                errorObj: error,
              };

            // if no error we will push the new boardgame to the boardgames array
            boardgames.push(new Boardgame(boardgame));
          });

          // resolve with boardgames
          resolve(boardgames);

        } catch (err) {
          reject(err); // reject with error
        }
        sql.close(); // closing the DB connection
      })();
    });
  }

  // static readById(boardgameid) returns a promise
  // if successful we resolve with the boardgame that matches the boardgameid
  // if unsuccessful we reject with an error
  static readById(boardgameid) {
    return new Promise((resolve, reject) => {
      (async () => {
        try {
          // open connection to DB
          const pool = await sql.connect(con);
          // query DB (SELECT all FROM boardgame and join tables with BoardgameCategory and Category) WHERE Boardgameid is the requested Boardgameid)
          const result = await pool
            .request()
            .input("boardgameid", sql.Int(), boardgameid) // setting up boardgameid as SQL variable
            .query(`
            SELECT *
            FROM bgBoardgame bg
                INNER JOIN bgBoardgameCategory bgc
                ON bg.boardgameid = bgc.FK_boardgameid
            INNER JOIN bgCategory c
            ON bgc.FK_categoryid = c.categoryid
            WHERE bg.boardgameid = @boardgameid
                        `);


          // if a boardgame has multiple categories, the boardgame will be in the result.recordset more than once
          // we want to create a boardgame object with an array of categories as objects
          // therefore we begin to restructure with this in mind
          const boardgameBinder = []; // empty array
          let binderLastIndex = -1; // because the first index is 0, and we need to increment it

          result.recordset.forEach((record) => {
            if (
              !boardgameBinder[binderLastIndex] ||
              record.boardgameid != boardgameBinder[binderLastIndex].boardgameid
            ) {
              //add new Boardgame
              const newBoardgame = {
                boardgameid: record.boardgameid,
                title: record.title,
                imageurl: record.imageurl,
                bgdescription: record.bgdescription,
                minplayers: record.minplayers,
                maxplayers: record.maxplayers,
                mintime: record.mintime,
                maxtime: record.maxtime,
                minage: record.minage,
                categories: [
                  {
                    categoryid: record.categoryid,
                    categoryname: record.categoryname,
                  },
                ],
              };
              boardgameBinder.push(newBoardgame);
              binderLastIndex++;
            } else {
              //add new category to the existing last added boardgame
              const newCategory = {
                categoryid: record.categoryid,
                categoryname: record.categoryname,
              };

              // adding the new category to the last added boardgame's categories
              boardgameBinder[binderLastIndex].categories.push(newCategory);
            }
          });
          // we need to validate each boardgame in the boardgameBinder
          const boardgames = [];
          boardgameBinder.forEach((boardgame) => {
            const { error } = Boardgame.validate(boardgame);
            if (error)
              throw {
                statusCode: 500,
                errorMessage: `Corrupt boardgame information in the database, boardgameid: ${boardgame.boardgameid}`,
                errorObj: error,
              };

            // push the new boardgame to the boardgames array
            boardgames.push(new Boardgame(boardgame));
          });

          // there should only be one boardgame in the array since only one boardgame will have the requested boardgameid
          if (boardgames.length > 1)
            throw {
              statusCode: 500,
              errorMessage: `Corrupt DB, mulitple boardgames with boardgameid: ${boardgameid}`,
              errorObj: {},
            };
          if (boardgames.length == 0)
            throw {
              statusCode: 404,
              errorMessage: `Boardgame not found by boardgameid: ${boardgameid}`,
              errorObj: {},
            };

          // resolve with the boardgame 
          resolve(boardgames[0]);
        } catch (err) {
          reject(err); // reject with error
        }

        sql.close(); // closing the DB connection
      })();
    });
  }

  // static readByTitle(title) returns a promise
  // if successful it will return the boardgame with the requested title
  // if unsucessful it will reject with an error
  static readByTitle(title) {
    return new Promise((resolve, reject) => {
      (async () => {
        try {
          // open connection to DB
          const pool = await sql.connect(con);

          // query DB (SELECT all FROM boardgame and join tables with BoardgameCategory and Category) WHERE title is the requested title)
          const result = await pool
            .request()
            .input("title", sql.NVarChar(), title).query(`
            SELECT *
            FROM bgBoardgame bg
                INNER JOIN bgBoardgameCategory bgc
                ON bg.boardgameid = bgc.FK_boardgameid
            INNER JOIN bgCategory c
            ON bgc.FK_categoryid = c.categoryid
            WHERE bg.title = @title
                        `);  

                        
          // if a boardgame has multiple categories, the boardgame will be in the result.recordset more than once
          // we want to create a boardgame object with an array of categories as objects
          // therefore we begin to restructure with this in mind
          const boardgameBinder = [];
          let binderLastIndex = -1; //because the first index is 0, and we need to increment it

          result.recordset.forEach((record) => {
            if (
              !boardgameBinder[binderLastIndex] ||
              record.boardgameid != boardgameBinder[binderLastIndex].boardgameid
            ) {
              //add new Boardgame
              const newBoardgame = {
                boardgameid: record.boardgameid,
                title: record.title,
                imageurl: record.imageurl,
                bgdescription: record.bgdescription,
                minplayers: record.minplayers,
                maxplayers: record.maxplayers,
                mintime: record.mintime,
                maxtime: record.maxtime,
                minage: record.minage,
                categories: [
                  {
                    categoryid: record.categoryid,
                    categoryname: record.categoryname,
                  },
                ],
              };
              boardgameBinder.push(newBoardgame); // add the newBoardgame to boardgameBinder
              binderLastIndex++; // increment binderLastIndex
            } else {
              //add new category to the existing last added boardgame
              const newCategory = {
                categoryid: record.categoryid,
                categoryname: record.categoryname,
              };
              
              // push the new category to the last added boardgame's categories
              boardgameBinder[binderLastIndex].categories.push(newCategory);
            }
          });
          // we need to validate each boardgame in the boardgameBinder
          const boardgames = [];
          boardgameBinder.forEach((boardgame) => {
            const { error } = Boardgame.validate(boardgame);
            if (error)
              throw {
                statusCode: 500,
                errorMessage: `Corrupt boardgame information in the database, boardgameid: ${boardgame.boardgameid}`,
                errorObj: error,
              };

            // if no validation error push the new boardgame to the boardgames array
            boardgames.push(new Boardgame(boardgame));
          });

          // there should only be one boardgame in the array since only one boardgame will have the requested title
          if (boardgames.length > 1)
            throw {
              statusCode: 500,
              errorMessage: `Corrupt DB, mulitple boardgames with title: ${title}`,
              errorObj: {},
            };
          if (boardgames.length == 0)
            throw {
              statusCode: 404,
              errorMessage: `Boardgame not found by title: ${title}`,
              errorObj: {},
            };

          // resolve with boardgame
          resolve(boardgames[0]);
        } catch (err) {
          reject(err); // reject with error
        }

        sql.close(); // Closes DB CONNECTION
      })();
    });
  }

  // create a boardgame
  create() {
    return new Promise((resolve, reject) => {
      (async () => {
        try {
          // check by title if boardgame exists
          const boardgame = await Boardgame.readByTitle(this.title);

          // if boardgame is found, that is an error because only one boardgame can have the title
          const error = {
            statusCode: 409,
            errorMessage: `Boardgame already exists`,
            errorObj: {},
          };
          return reject(error); // reject with error
        } catch (err) {
          // if there was an error with 404 error that means the boardgame was not found (which is good)
          // therefore if the error is not the 404 error that means a real error
          if (!err.statusCode || err.statusCode != 404) {
            return reject(err); // reject with error
          }
        }

        try {
          // open connection to DB
          const pool = await sql.connect(con);

          // imageurl can be null
          if (!this.imageurl) {
            this.imageurl = null;
          }

          // query DB --> INSERT INTO BgBoardgame; SELECT WHERE boardgameid = SCOPE_IDENTITY()
          const resultBoardgame = await pool
            .request()
            .input("title", sql.NVarChar(), this.title) // setting up the title as SQL variable, the value is in the boardgame object
            .input("imageurl", sql.NVarChar(), this.imageurl) // setting up the imageurl as SQL variable, the value is in the boardgame object
            .input("bgdescription", sql.NVarChar(), this.bgdescription) // setting up the description as SQL variable, the value is in the boardgame object
            .input("minplayers", sql.Int(), this.minplayers) // setting up the minplayers as SQL variable, the value is in the boardgame object
            .input("maxplayers", sql.Int(), this.maxplayers) // setting up the maxplayers as SQL variable, the value is in the boardgame object
            .input("mintime", sql.Int(), this.mintime) // setting up the mintime as SQL variable, the value is in the boardgame object
            .input("maxtime", sql.Int(), this.maxtime) // setting up the maxtime as SQL variable, the value is in the boardgame object
            .input("minage", sql.Int(), this.minage) // setting up the minage as SQL variable, the value is in the boardgame object
            .query(`
                            INSERT INTO bgBoardgame
                                ([title], [imageurl], [bgdescription], [minplayers], [maxplayers], [mintime], [maxtime], [minage])
                            VALUES
                                (@title, @imageurl, @bgdescription, @minplayers, @maxplayers, @mintime, @maxtime, @minage);
                            SELECT *
                            FROM bgBoardgame bg
                            WHERE bg.boardgameid = SCOPE_IDENTITY();
                        `); //scope_identity: Returns the last identity value inserted into an identity column in the same scope

          // check we only get exactly 1 result
          if (resultBoardgame.recordset.length != 1)
            throw {
              statusCode: 500,
              errorMessage: `INSERT INTO boardgame table failed`,
              errorObj: {},
            };

          // "restructure" result
          const boardgameid = resultBoardgame.recordset[0].boardgameid;

          let queryCategoryString = "";

          // for every category the boardgame has, we want to add to the boardgameCategory table, therefore we build this query string
          this.categories.forEach((category) => {
            queryCategoryString += `(${boardgameid}, ${category.categoryid}),`; // fx: (1, 1), (1, 2), (1, 3),
          });

          // remove the last comma
          queryCategoryString = queryCategoryString.replace(/.$/, ""); // /.$/ = last character of the string ==> (b, c1), (b,c2), (b,c3)

          // query DB --> INSERT INTO bgBoardgameCategory
          const resultBoardgameCategory = await pool.request().query(`
                            INSERT INTO bgBoardgameCategory
                                ([FK_boardgameid], [FK_categoryid])
                            VALUES
                                ${queryCategoryString}
                        `);

          // closes db connection
          sql.close();

          // get the new boardgame by boardgameid
          const boardgame = await Boardgame.readById(boardgameid);

          // resolve with boardgame
          resolve(boardgame);
        } catch (err) {
          reject(err); // reject with error
        }

        sql.close(); // Closes DB connection
      })(); 
    });
  }

  // update a boardgame
  update() {
    return new Promise((resolve, reject) => {
      (async () => {
        try {
          let tmpResult;
          // get the boardgame by boardgameid
          tmpResult = await Boardgame.readById(this.boardgameid);

          // open connection to DB
          const pool = await sql.connect(con);

          // query DB --> UPDATE bgBoardgame WHERE boardgameid
          tmpResult = await pool
            .request()
            .input("boardgameid", sql.Int(), this.boardgameid) // setting up the boardgameid as SQL variable, the value is in the boardgame object
            .input("title", sql.NVarChar(), this.title) // setting up the title as SQL variable, the value is in the boardgame object
            .input("imageurl", sql.NVarChar(), this.imageurl) // setting up the imageurl as SQL variable, the value is in the boardgame object
            .input("bgdescription", sql.NVarChar(), this.bgdescription) // setting up the description as SQL variable, the value is in the boardgame object
            .input("minplayers", sql.Int(), this.minplayers) // setting up the minplayers as SQL variable, the value is in the boardgame object
            .input("maxplayers", sql.Int(), this.maxplayers) // setting up the maxplayers as SQL variable, the value is in the boardgame object
            .input("mintime", sql.Int(), this.mintime) // setting up the mintime as SQL variable, the value is in the boardgame object
            .input("maxtime", sql.Int(), this.maxtime) // setting up the maxtime as SQL variable, the value is in the boardgame object
            .input("minage", sql.Int(), this.minage) // setting up the minage as SQL variable, the value is in the boardgame object
            .query(`
                  UPDATE bgBoardgame 
                  SET title = @title, imageurl = @imageurl, bgdescription = @bgdescription, 
                  minplayers = @minplayers, maxplayers = @maxplayers, mintime = @mintime, maxtime = @maxtime,
                  minage = @minage
                  WHERE boardgameid = @boardgameid
            `);

          //slet alle
          //så tilføj alle
          // DELETE FROM TABELNAVN WHERE ID = NOGET
          
          // Creating an empy string
          let queryCategoryString = "";

          // loop through the boardgame's categories to build query string for bgBoardgameCatgory
          this.categories.forEach((category) => {
            queryCategoryString += `(${this.boardgameid}, ${category.categoryid}),`;
          });

          // remove the last comma
          queryCategoryString = queryCategoryString.replace(/.$/, ""); // /.$/ = last character of the string

          // query DB:
          // first we delete all the categories where FK_boardgameid == this.boardgameid
          // then we insert all categories again from the queryCategoryString
          const resultBoardgameCategory = await pool
            .request()
            .input("boardgameid", sql.Int(), this.boardgameid) // setting up the boardgameid as SQL variable, the value is in the boardgame object
            .query(`
                              DELETE FROM bgBoardgameCategory WHERE FK_boardgameid = @boardgameid;
                              INSERT INTO bgBoardgameCategory
                                  ([FK_boardgameid], [FK_categoryid])
                              VALUES
                                  ${queryCategoryString}
                          `);

          // close db
          sql.close();

          // get boardgame by boardgameid
          const boardgame = await Boardgame.readById(this.boardgameid);

          // resolve with boardgame
          resolve(boardgame);
        } catch (err) {
          reject(err); // reject with error
        }

        sql.close(); // close DB connection
      })();
    });
  }

  // delete a boardgame
  delete() {
    return new Promise((resolve, reject) => {
      (async () => {
        try {
          // get boardgame by boardgameid
          const boardgame = await Boardgame.readById(this.boardgameid);

          // open connection to DB
          const pool = await sql.connect(con);

          // query DB bgBoardgame --> DELETE WHERE boardgameid
          let tmpResult;
          tmpResult = await pool
            .request()
            .input("boardgameid", sql.Int(), this.boardgameid).query(`
                  DELETE FROM bgBoardgameCategory WHERE FK_boardgameid = @boardgameid;
                  DELETE FROM bgBoardgame
                  WHERE boardgameid = @boardgameid;
              `);

          resolve(boardgame); // resolve with boardgame
        } catch (err) {
          reject(err); // reject with error
        }
        sql.close(); // closes DB connection
      })();
    });
  }
}

module.exports = Boardgame;
