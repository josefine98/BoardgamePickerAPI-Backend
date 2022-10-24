const express = require('express'); //express is used to create the API and helps handle routing and middleware - source: https://www.simplilearn.com/tutorials/nodejs-tutorial/what-is-express-js 
const app = express(); //app is defined as the express object - source: https://developer.mozilla.org/en-US/docs/Learn/Server-side/Express_Nodejs/Introduction 

const env = require('dotenv').config(); // dotenv's config method reads and initialises the environment variables in the .env file in the root folder
const config = require('config'); // the config module will automatically look for the configuration settings in the ./config folder


const cors = require('cors'); //for handling cross-origin resource sharing (CORS) with browsers 

const resJSON = require('./middleware/resJSON'); // middleware to set response header 'Content-type' to 'application/json'

//require routes handlers
const boardgames = require('./routes/boardgames');
const categories = require('./routes/categories');
const login = require('./routes/login');
const accounts = require('./routes/accounts');

//app.use() says, that whenever a request hits the backende, express will execute the functions passed to app.use() in order - source: https://masteringjs.io/tutorials/express/express-json 
app.use(express.json()); //express.json() is a middleware function in express, that parses incoming JSON requests and puts the parsed data in req.body - source: https://masteringjs.io/tutorials/express/express-json 
app.use(resJSON); //sets response header 'Content-type' to 'application/json' 


// the custom header for the authentication token (see ./routes/login.js)
// needs to be exposed by cors, or the browser will not see it
const corsOptions = {
 exposedHeaders: ['x-authentication-token']  
}

app.use(cors(corsOptions)); //added to the request pipeline, the cors() middleware prepares the CORS related response headers


//insert app.use endpoints
//route handlers will be called when the url's first part (after the server:port) is matched with the specified routing rule (/pattern)
app.use('/api/accounts/login', login); 
app.use('/api/accounts', accounts);   
app.use('/api/boardgames', boardgames);
app.use('/api/categories', categories);

//starting api 'app' to listen on port
app.listen(config.get('port'), () => console.log(`Listening on port ${config.get('port')}...`));


//.env:
//environment variables keep secrets in the environment, as it lives outside your codebase
//the dotenv module emulates an environment defined by the .env file
//the .env file is in the project's root folder


//config:
//the module allows for easy management of differenet configurations, e.g. test environment, production environment, etc.
//config's json files live in the ./config folder
//the current configuration (default) is a merge of the default.json and custom-environment-variables.json files
//the 'dbConfig_UCN' configuration variable is an object that follows the structure of the mssql module's DB connection string
//     "dbConfig_UCN": {
//         "user": "DB_USER",
//         "password": "DB_PASSWORD",
//         "database": "DB_NAME",
//         "server": "DB_HOST",
//         "options": {
//             "encrypt": true,
//             "trustServerCertificate": true
//         }
//     } 