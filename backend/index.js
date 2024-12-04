// Chloe Cloud, John Gibson, Aaron Shaw, Andrew Malone
// Description: This is a node express app that serves as the backend for the Turtle Shelter project website 
let express = require('express');

let app = express(); // app is now an object of express type. App is variable of the whole website

let path = require('path'); // access to the path 

const port = process.env.PORT || 5001

const session = require('express-session'); 

app.use(express.urlencoded( {extended: true} )) //determines how html is received from forms. This allows us to grab stuff out of the HTML form

app.set("view engine", "ejs") //shows what view engine we are using 

app.set("views", path.join(__dirname, "../frontend/views")) //This is telling the server that we are going to start using certain views

app.use(express.urlencoded({extended: true})); //allows us to get data out of the request.body


// Session middleware setup
app.use(session({
  secret: '123456789', // Replace with a secure secret key
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 60 * 60 * 1000 } // Session expires after 60 minutes
}));


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
   .where({ username, password }) // Note: Storing plaintext passwords is insecure
   .first()
   .then(user => {
     if (user) {
       // Set session variable
       req.session.isAuthenticated = true;
       req.session.save(err => {
         if (err) {
           console.error('Session save error:', err);
           return res.status(500).send('Internal Server Error');
         }
         // Redirect to internal landing page if login is successful
         res.redirect('/internalLanding');
       });
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

// Authentication middleware
function isAuthenticated(req, res, next) {
  if (req.session && req.session.isAuthenticated) {
    // User is authenticated, proceed to the next middleware
    return next();
  } else {
    // User is not authenticated, redirect to login page
    res.redirect('/login');
  }
}

// Protected routes using the authentication middleware
app.get('/internalLanding', isAuthenticated, (req, res) => {
  res.render('internalLanding');
});


//Route to adminRecords page
app.get('/adminRecords', isAuthenticated, (req, res) => {
  res.render('adminRecords');
});

//Route to display Event records 
app.get('/eventRecords', isAuthenticated, (req, res) => {
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
app.post('/deleteEventRec/:eventid', isAuthenticated, (req, res) => {

  const eventid = parseInt(req.params.eventid, 10);

  knex('event')
    .where('eventid', eventid)
    .del() // Deletes the record with the specified ID
    .then(() => {
      res.redirect('/eventRecords'); // Redirect to the Event Records Table after deletion
    })
    .catch(error => {
      console.error('Error deleting Event Record:', error);
      res.status(500).send('Internal Server Error');
    });
});   


app.get('/volunteerRecords', isAuthenticated, (req, res) => {
  knex('volunteer')
    .select(
      'volunteerid',
      'firstname',
      'lastname',
      'email',
      'phone',
      'city',
      'state',
      'howtheyheard',
      'sewinglevel',
      'monthlyhrswilling',
      'leadwilling',
      'traveltime',
      'comments'
    )
    .then(volunteer => {
      // Render the volunteerRecords.ejs template and pass the data
      res.render('volunteerRecords', { volunteer });
    })
    // Catch to handle errors
    .catch(error => {
      console.error('Error querying database:', error);
      res.status(500).send('Internal Server Error');
    });
});

// Deletes a volunteer and any associated admin records
app.post('/deleteVolunteer/:volunteerid', (req, res) => {
  const volunteerid = parseInt(req.params.volunteerid, 10); // Extract volunteer ID

  // Step 1: Delete associated admin record first
  knex('admin')
    .where('volunteerid', volunteerid)
    .del()
    .then(() => {
      // Step 2: Delete the volunteer record
      return knex('volunteer').where('volunteerid', volunteerid).del();
    })
    .then(() => {
      res.redirect('/volunteerRecords'); // Redirect after successful deletion
    })
    .catch(error => {
      console.error('Error deleting Volunteer Record:', error);
      res.status(500).send('Internal Server Error');
    });
});


// Route to display admin records
app.get('/adminRecords', (req, res) => {
  knex('admin')
    .join('volunteer', 'volunteer.volunteerid', '=', 'admin.volunteerid')
    .select(
      'volunteer.volunteerid',
      'volunteer.firstname',
      'volunteer.lastname',
      'volunteer.phone',
      'volunteer.email',
      'volunteer.city',
      'volunteer.state',
      'admin.username',
      'admin.password'
    )
    .then(admin => {
      console.log(admin); // Log the data to verify structure
      res.render('adminRecords', { admin }); // Pass the admin data to the EJS template
    })
    .catch(error => {
      console.error('Error querying database:', error);
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

  const comments = req.body.Comments || 'No comments';


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
  const startdaterange = req.body.startdaterange;

  const enddaterange = req.body.enddaterange || null;

  const expectedparticipants = parseInt(req.body.expectedparticipants); 

  const expectedduration = parseInt(req.body.expectedduration);

  const eventactivities = req.body.eventactivities; 

  const address = req.body.address;

  const city = req.body.city;

  const state = req.body.state;

  const zip = req.body.zip;

  const contactname = req.body.contactname;

  const contactphone = req.body.contactphone;

  const contactemail = req.body.contactemail;

  const jenshare = req.body.jenshare;

  const organization = req.body.organization;

  const comments = req.body.comments || 'No comments';

  const eventstatus = "Pending"

  // Insert the event in the database
  knex('event')
    .insert({
      startdaterange : startdaterange,
      enddaterange : enddaterange,
      expectedparticipants : expectedparticipants,
      expectedduration :expectedduration,
      eventactivities : eventactivities,
      address : address,
      city : city,
      state : state,
      zip : zip,
      contactname : contactname,
      contactphone : contactphone,
      contactemail : contactemail,
      jenshare : jenshare,
      organization : organization,
      comments : comments,
      eventstatus : eventstatus,
    })
    .then(() => {
      res.redirect('/'); // Redirect to 
    })
    .catch(error => {
      console.error('Error adding event:', error);
      res.status(500).send('Internal Server Error');
    });
});


// app listening
app.listen(port, () => console.log("Express App has started and server is listening!"));
