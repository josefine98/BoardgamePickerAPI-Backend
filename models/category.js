const Joi = require('joi'); // joi module used for validation
const sql = require('mssql'); // mssql module for managing connection/query with a mssql DB server

const config = require('config');  // config module for accessing the configuration (partially) defined in the environment   
const con = config.get('dbConfig_UCN'); // 'dbconfig_UCN' configuration variable contains the connection string to the mssql DB server

class Category {
        // the constructor gets called when a new object instance is created based on the class
    constructor(categoryObj) {
        if( categoryObj.categoryid) { // check if categoryid exists - as the id is assigned by the DB
            this.categoryid = categoryObj.categoryid;
        }
        this.categoryname = categoryObj.categoryname; // categoryname is mandatory
    }

    //validation of the Category object 
    //the schema must be the same structure as the object to be validated
    //by default only the specified properties are allowed to exist in the object
    //if something else is there the validate method will return an error 
    static validationSchema(){
        const schema = Joi.object({
            categoryid: Joi.number() // categoryid has to an integer and minimum 1 
                .integer()
                .min(1),
            categoryname: Joi.string() // categoryname has to an string and maximum 50, and is required 
                .max(50)
                .required()
        })

        return schema;
    }

    // static validate(acategoryObj) returns the validation result, based on the validationSchema
    static validate(categoryObj) {
        const schema = Category.validationSchema();

        return schema.validate(categoryObj);
    }

    // static readAll(category)
    static readAll() {
        return new Promise((resolve, reject) => {
            (async()=> {
                try {
                    const pool = await sql.connect(con);  // opens DB connection
                    const result = await pool.request() // SELECTS all columns FROM Category
                        .query(`
                            SELECT *
                            FROM bgCategory
                        `);
                    const categories = []; // Makes an empy array
                    result.recordset.forEach(record => { // restructure categoryWannabe
                        const categoryWannabe = {
                            categoryid: record.categoryid,
                            categoryname: record.categoryname
                        }
                        // Validate categoryWannabe
                        const {error} = Category.validate(categoryWannabe);
                        if (error) throw {statusCode:500, errorMessage:`Corrupt category information in the database, categoryid: ${categoryWannabe.categoryid}`} 
                    
                        categories.push(new Category(categoryWannabe)); // push a New Category object into Category array
                    })
                    // resolve with an array of authors
                    resolve(categories)
                } catch (err) {
                    reject(err);
                }

                sql.close(); // closes DB connection
            })();
        })
    }
}

module.exports = Category;