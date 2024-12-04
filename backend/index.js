// Chloe Cloud, John Gibson, Aaron Shaw, Andrew Malone
// Description: This is a node express app that serves as the backend for the Turtle Shelter project website 
let express = require('express');

let app = express(); // app is now an object of express type. App is variable of the whole website

let path = require('path'); // access to the path 

const port = process.env.PORT || 5001

app.use(express.urlencoded( {extended: true} )) //determines how html is received from forms. This allows us to grab stuff out of the HTML form

app.set("view engine", "ejs") //shows what view engine we are using 

app.set("views", path.join(__dirname, "../frontend/views")) //This is telling the server that we are going to start using certain views

app.use(express.urlencoded({extended: true})); //allows us to get data out of the request.body

// Serve static files from the 'CSS' directory
app.use('/css', express.static(path.join(__dirname, '../frontend/css')));

// Serve static files from the 'backend' folder (for JavaScript)
app.use('/backend', express.static(path.join(__dirname, 'backend')));

// Serve static files from the frontend folder
app.use(express.static('frontend'));

const knex = require("knex") ({
  client : "pg",
  connection : {
      host : process.env.RDS_HOSTNAME || "awseb-e-xg3qx7rimi-stack-awsebrdsdatabase-d32v4dftp3db.cna8yiecw5c6.us-east-1.rds.amazonaws.com",
      user : process.env.RDS_USERNAME || "turtle",
      password : process.env.RDS_PASSWORD || "splishsplash",
      database : process.env.RDS_DB_NAME || "ebdb",
      port : process.env.RDS_PORT || 5432,
      ssl: {rejectUnauthorized: false}
  }
});




// Routes and other middleware
app.get('/', (req, res) => {
  res.render('index');  // Or your view rendering logic
});

//Route to got to the event request page
app.get('/eventRequest', (req, res) => {
  res.render('eventRequest'); 

});

//Route to How to help page
app.get('/howToHelp', (req, res) => {
  res.render('howToHelp'); 

}); 

//Route to the donate page
app.get('/donate', (req, res) => {
  res.redirect('https://turtleshelterproject.org/checkout/donate?donatePageId=5b6a44c588251b72932df5a0'); 

});


//Route to volunteer form page
app.get('/volunteerForm', (req, res) => {
  res.render('volunteerForm'); 

});

app.get('/login', (req, res) => {
  res.render('login'); 

});

app.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.render('login', { error: 'Username and password are required.' });
  }

  // Query the database to check if the username and password exist
  knex('admin')
    .select('*')
    .where({ username, password }) // Check against plaintext password
    .first() // Fetch only one record
    .then(user => {
      if (user) {
        // Redirect to internal landing page if login is successful
        res.redirect('/internalLanding');
      } else {
        // Render login page with error if invalid credentials
        res.render('login', { error: 'Invalid username or password.' });
      }
    })
    .catch(err => {
      console.error('Database error:', err);
      res.status(500).send('Internal Server Error');
    });
});

//Route to How to help page
app.get('/internalLanding', (req, res) => {
  res.render('internalLanding'); 

}); 

//Route to How to help page
app.get('/eventRecords', (req, res) => {
  res.render('eventRecords'); 

}); 

//Route to How to help page
app.get('/adminRecords', (req, res) => {
  res.render('adminRecords'); 

}); 

//Route to display Event records 
app.get('/eventRecords', (req, res) => {
  knex('event')
      .select(
      'eventid',
      'eventdate',
      'starttime',
      'city',
      'state',
      'zip',
      'contactname',
      'eventactivities', 
      'organization'
    )
    .then(event => {
      // Render the eventRecords.ejs template and pass the data
      res.render('eventRecords', { event });
    })
    // Memorize or paste in to the end of all 
    .catch(error => {
      console.error('Error querying database:', error);
      res.status(500).send('Internal Server Error');
    });
});

// this chunk of code finds the record with the primary key aka id and deletes the record
app.post('/deleteEventRec/:eventid', (req, res) => {

  const eventid = req.params.eventid;

  knex('event')
    .where('eventid', eventid)
    .del() // Deletes the record with the specified ID
    .then(() => {
      res.redirect('/eventRec'); // Redirect to the Event Records Table after deletion
    })
    .catch(error => {
      console.error('Error deleting Event Record:', error);
      res.status(500).send('Internal Server Error');
    });
});   



// To post the new volunteer to the database
app.post('/submitVolunteerForm', (req, res) => {

  // Access each value directly from req.body
  const firstname = req.body.FirstName;

  const lastname = req.body.LastName;

  const phone = req.body.Phone; 

  const email = req.body.Email;

  const city = req.body.City; 

  const state = req.body.State;

  const howtheyheard = req.body.HowTheyHeard;

  const sewinglevel = req.body.SewingLevel;

  const monthlyhrswilling = parseInt(req.body.MonthlyHrsWilling); // Convert to integer

  const leadwilling = req.body.LeadWilling;

  const traveltime = parseInt(req.body.TravelTime); // Convert to integer

  const comments = req.body.Comments;


  // Insert the Volunteer in the database
  knex('volunteer')
    .insert({
      firstname: firstname,
      lastname: lastname,
      phone: phone,
      email: email,
      city: city,
      state: state,
      howtheyheard: howtheyheard,
      sewinglevel: sewinglevel,
      monthlyhrswilling: monthlyhrswilling,
      leadwilling: leadwilling,
      traveltime: traveltime,
      comments: comments,
    })
    .then(() => {
      res.redirect('/'); // Redirect to 
    })
    .catch(error => {
      console.error('Error adding Volunteer:', error);
      res.status(500).send('Internal Server Error');
    });
});


// To post the event request to the database
app.post('/EventRequest', (req, res) => {

  // Access each value directly from req.body
  const firstname = req.body.FirstName;

  const lastname = req.body.LastName;

  const phone = req.body.Phone; 

  const email = req.body.Email;

  const city = req.body.City; 

  const state = req.body.State;

  const howtheyheard = req.body.HowTheyHeard;

  const sewinglevel = req.body.SewingLevel;

  const monthlyhrswilling = parseInt(req.body.MonthlyHrsWilling); // Convert to integer

  const leadwilling = req.body.LeadWilling;

  const traveltime = parseInt(req.body.TravelTime); // Convert to integer

  const comments = req.body.Comments;


  // Insert the Volunteer in the database
  knex('volunteer')
    .insert({
      firstname: firstname,
      lastname: lastname,
      phone: phone,
      email: email,
      city: city,
      state: state,
      howtheyheard: howtheyheard,
      sewinglevel: sewinglevel,
      monthlyhrswilling: monthlyhrswilling,
      leadwilling: leadwilling,
      traveltime: traveltime,
      comments: comments,
    })
    .then(() => {
      res.redirect('/'); // Redirect to 
    })
    .catch(error => {
      console.error('Error adding Volunteer:', error);
      res.status(500).send('Internal Server Error');
    });
});


// app listening
app.listen(port, () => console.log("Express App has started and server is listening!"));
