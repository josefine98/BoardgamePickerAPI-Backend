const express = require('express'); //express is used to create the API and helps handle routing and middleware - source: https://www.simplilearn.com/tutorials/nodejs-tutorial/what-is-express-js 
const router = express.Router(); //creates new Router object using express - used to create router objects to handle requests - source: https://www.geeksforgeeks.org/express-js-express-router-function/ 

//requires Category class
const Category = require('../models/category');

//GET /api/categories/
router.get('/', async (req, res) => {
    res.header('Content-type', 'application/json'); //sends response back to the client in JSON format 
    try {
        //calling Category.readAll() function 
        const categories = await Category.readAll();
        return res.send(JSON.stringify(categories)); //takes javascript object and turns it into string

    } catch (err) { //if error, return error 
        if (err.statusCode) return res.status(err.statusCode).send(JSON.stringify(err)); //if the error has a statusCode, send statusCode
        return res.status(500).send(JSON.stringify(err)); //if not, send error with statusCode: 500
    }
})

module.exports = router; // router object is exported from this 'module' to be seen in other modules when using the command 'require'