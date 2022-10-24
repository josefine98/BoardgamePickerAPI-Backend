const express = require('express'); //express is used to create the API and helps handle routing and middleware - source: https://www.simplilearn.com/tutorials/nodejs-tutorial/what-is-express-js 
const router = express.Router(); //creates new Router object using express - used to create router objects to handle requests - source: https://www.geeksforgeeks.org/express-js-express-router-function/ 

// requiring middleware functions used to protect endpoints
const auth = require('../middleware/authenticate');
const admin = require('../middleware/admin');
const check = require('../middleware/checkauthorisation');

const Joi = require('joi'); // joi module used for validation
const Boardgame = require('../models/boardgame');

// GET /api/boardgame
router.get('/', async (req, res) => {
    res.header('Content-type', 'application/json');
    try {
        //we define the 'base case' for each key, meaning every query not specified will not factor in the filtering
        let categoryQuery = "1=1"; //1=1 is tsql for true, meaning everything in the column is selected in the WHERE clause
        let playersQuery = "1=1";
        let timeQuery = "1=1";
        let minageQuery = "1=1";


        // the problem with this method is that one could potentially put DROP TABLE into a variable --> sql injection attack (therefore we validate for this by not allowing semi colons)
        // pattern /[;]/ matches with semicolon and with {invert: true} the pattern will be disallowed instead of required - https://joi.dev/api/?v=17.6.1#stringpatternregex-name--options---aliases-regex 
        let query = req.query; 
        const schema = Joi.object({
            category: Joi.string()
                .pattern(/[;]/, {invert: true}), 
            players: Joi.number()
                .integer()
                .min(1),
            time: Joi.number()
                .integer()
                .min(1),
            minage: Joi.number()
                .integer()
                .min(1)
        })
        
        
        // validating the query
        let validationResult = schema.validate(req.query);
        if (validationResult.error) throw { statusCode: 400, errorMessage: `Badly formatted request`, errorObj: validationResult.error }

        //Each key in the query will go through the switch statement
        Object.keys(req.query).forEach(key => {
            switch (key) {
                case 'category':
                    categoryQuery = req.query.category; //string value of the category = query 
                    //Removes all newlines (for some reason there are newlines at the end of the query)
                    categoryQuery = categoryQuery.replaceAll('\n', ''); 
                    //builds the string we will put into the sql for filtering on category in ReadAllFromQueries(); 
                    //replaces all , with OR ____, so all categories in the query will be part of the sql query
                    categoryQuery = `c.categoryname = '${categoryQuery.replaceAll(',', `' OR c.categoryname = '`)}'`; 
                    break;
                case 'players':
                    // amount of players should be between min and max players or equal to them
                    playersQuery = `bg.minplayers <= ${req.query.players}  AND  ${req.query.players} <= bg.maxplayers`; 
                    break;
                case 'time':
                    // time should be greater or equal to min time
                    timeQuery = `${req.query.time} >= bg.mintime`; 
                    break;
                case 'minage':
                    // age should be greater or equal to minage
                    minageQuery = `bg.minage <= ${req.query.minage}`; 
                    break;
                default: //default is gettings ALL boardgames (no query)
                    break;
            } 
        });

        //defines boardgamesLibrary as the list of boardgames returned when calling the readAllFromQueries() function
        let boardgamesLibrary = await Boardgame.readAllFromQueries(categoryQuery, playersQuery, timeQuery, minageQuery);
        
        //returns boardgamesLibrary
        return res.send(JSON.stringify(boardgamesLibrary));

    } catch (err) {
        if (err.statusCode) return res.status(err.statusCode).send(JSON.stringify(err));
        return res.status(500).send(JSON.stringify(err));
    }

})

// POST api/boardgame
router.post('/', [auth, admin, check], async (req, res) => {
    try {
            // need to validate the req.body (payload)
            const { error } = Boardgame.validate(req.body);
            if (error) throw { statusCode: 400, errorMessage: `Badly formatted request`, errorObj: error }
    
            // create a new boardgame object with the req.body
            const boardgameToBeSaved = new Boardgame(req.body);

            // call create() method on the new boardgame object
            const boardgame = await boardgameToBeSaved.create();
    
            // respond with boardgame
            return res.send(JSON.stringify(boardgame));
    } catch (err) {
        if (err.statusCode) {   // if error with statusCode 
            return res.status(err.statusCode).send(JSON.stringify(err));
        }
        return res.status(500).send(JSON.stringify(err));   // if no statusCode
    }
})

// PUT api/boardgame
router.put('/:boardgameid', [auth, admin, check], async (req, res) => {
    try {
        // need to validate boardgameid in req.params
        const schema = Joi.object({
            boardgameid: Joi.number()
                .integer()
                .min(1)
                .required()
        })

        // validating the req.params
        let validationResult = schema.validate(req.params);
        if (validationResult.error) throw { statusCode: 400, errorMessage: `Badly formatted request`, errorObj: validationResult.error }

        // getting boardgame by req.params.boardgameid and assigning it to boardgameById
        const boardgameById = await Boardgame.readById(req.params.boardgameid);  // boardgameById will hold the updated values before sent to DB
        
        // overwrite boardgameById's properties with req.body
        if (req.body.title) {
            boardgameById.title = req.body.title;
        }
        if (req.body.imageurl) {
            boardgameById.imageurl = req.body.imageurl;
        }
        if (req.body.bgdescription) {
            boardgameById.bgdescription = req.body.bgdescription;
        }
        if (req.body.minplayers) {
            boardgameById.minplayers = req.body.minplayers;
        }
        if (req.body.maxplayers) {
            boardgameById.maxplayers = req.body.maxplayers;
        }
        if (req.body.mintime) {
            boardgameById.mintime = req.body.mintime;
        }
        if (req.body.maxtime) {
            boardgameById.maxtime = req.body.maxtime;
        }
        if (req.body.minage) {
            boardgameById.minage = req.body.minage;
        }
        if (req.body.categories) {
            boardgameById.categories = req.body.categories;
        }
        
        // validating boardgameById
        validationResult = Boardgame.validate(boardgameById);
        if (validationResult.error) throw { statusCode: 400, errorMessage: `Badly formatted request`, errorObj: validationResult.error }

        let boardgameByTitle;
        try {
            // call Boardgame.readByTitle(boardgameById.title)
            boardgameByTitle = await Boardgame.readByTitle(boardgameById.title);
            // if boardgameByTitle is found that is okay since it could mean it is the same boardgame we are working on
        } catch (innerErr) {
            if (innerErr.statusCode == 404) {   // if boardgameByTitle is NOT found that is okay too since the title is changed to something that is not in the DB yet
                boardgameByTitle = boardgameById   // we set boardgameByTitle to boardgameById and compare these later
            } else {
                throw innerErr;    // this means a real error, throw innerErr "outward" to let the outer try-catch structure's catch handle it
            }
        }

        // we do a comparasion between the id of boardgameById and boardgameByTitle
        if (boardgameById.boardgameid != boardgameByTitle.boardgameid) throw { statusCode: 403, errorMessage: `Cannot update boardgame with name: ${boardgameById.title}`, errorObj: {} }

        // call BoardgameById.update()
        const boardgame = await boardgameById.update();

        // respond with (updated) boardgame
        return res.send(JSON.stringify(boardgame));
    } catch (err) {
        if (err.statusCode) {   // if error with statusCode 
            return res.status(err.statusCode).send(JSON.stringify(err));
        }
        return res.status(500).send(JSON.stringify(err)); 
    }
})


// DELETE api/boardgames/boardgameid
router.delete('/:boardgameid', [auth, admin, check], async(req, res) => {
    try {
        // need to validate the boardgameid in req.params
        const schema = Joi.object({
            boardgameid: Joi.number()
                .integer()
                .min(1)
                .required()
        })

        // validating the req.params
        const { error } = schema.validate(req.params);
        if (error) throw { statusCode: 400, errorMessage: `Badly formatted request`, errorObj: error }

        // call Boardgame.readById(req.params.boardgame) to get the boardgame
        const boardgame = await Boardgame.readById(req.params.boardgameid);

        // call delete() to delete the boardgame
        const deletedBoardgame = await boardgame.delete();

        // respond with boardgame - that has been removed from the DB
        // RESTful rule: show what's been deleted
        return res.send(JSON.stringify(deletedBoardgame));

    } catch (err) {
        if (err.statusCode) {   // if error with statusCode 
            return res.status(err.statusCode).send(JSON.stringify(err));
        }
        return res.status(500).send(JSON.stringify(err));   // if no statusCode
    }
})



module.exports = router;