// Chloe Cloud, John Gibson, Aaron Shaw, Andrew Malone
// Description: This is a node express app that serves as the backend for the Turtle Shelter project website 

// Import express as express
let express = require('express');

let app = express(); // app is now an object of express type. App is variable of the whole website

let path = require('path'); // access to the path 

// // lets you import your .env variables from config.js
// const config = require('./config/config'); 

// // Importing Users model used to run CRUD operations on db table for user table
// const Users = require("./models/users");

let port = 5001

app.use(express.urlencoded( {extended: true} )) //determines how html is received from forms. This allows us to grab stuff out of the HTML form
// This is an object literal. Basically a dictionary


app.set("view engine", "ejs") //shows what view engine we are using 

app.set("views", path.join(__dirname, "../frontend/views")) //This is telling the server that we are going to start using certain views

app.use(express.urlencoded({extended: true})); //allows us to get data out of the request.body

// Serve static files from the 'CSS' directory
app.use('/CSS', express.static(path.join(__dirname, '../frontend/css')));

// Serve static files from the frontend folder
app.use(express.static('frontend'));

// Routes and other middleware
app.get('/', (req, res) => {
  res.render('index');  // Or your view rendering logic
});

// app listening
app.listen(port, () => console.log("Express App has started and server is listening!"));
