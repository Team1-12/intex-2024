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

//Route to get howToHelpIcons
app.get('/howToHelpIcons', (req, res) => {
  res.redirect('/howToHelp#help');
});



//Route to the donate page
app.get('/donate', (req, res) => {
  res.redirect('https://turtleshelterproject.org/checkout/donate?donatePageId=5b6a44c588251b72932df5a0'); 

});

//Route to volunteer page
app.get('/volunteerPage', (req, res) => {
  res.render('volunteerPage'); 

});

//Route to volunteer form page
app.get('/volunteerForm', isVolunteer, (req, res) => {
  res.render('volunteerForm'); 

});

//Route to admin form page
app.get('/addAdmin', isAuthenticated, (req, res) => {
  res.render('adminForm'); 

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
        // Set session variables
        req.session.isAuthenticated = true;
        req.session.userRole = user.role; // Assuming the `role` column specifies the user's role (e.g., 'admin' or 'volunteer')

        req.session.save(err => {
          if (err) {
            console.error('Session save error:', err);
            return res.status(500).send('Internal Server Error');
          }

          // Redirect based on the user's role
          if (user.role === 'admin') {
            res.redirect('/internalLanding'); // Redirect to internalLanding for admin
          } else if (user.role === 'volunteer') {
            res.redirect('/volunteerPage'); // Redirect to volunteerPage for volunteers
          }
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

// Authorization middleware for admin users
function isAdmin(req, res, next) {
  if (req.session && req.session.userRole === 'admin') {
    return next();
  } else {
    res.status(403).send('Access denied. Admins only.');
  }
}

// Authorization middleware for regular users
function isVolunteer(req, res, next) {
  if (req.session && (req.session.userRole === 'volunteer' || req.session.userRole === 'admin')) {
    return next();
  } else {
    res.status(403).send('Access denied.');
  }
}

// Logout endpoint
app.get('/logout', (req, res) => {
  // Destroy the session
  req.session.destroy(err => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).send('Failed to log out. Please try again.');
    }
    // Redirect to home page or login page after logout
    res.redirect('/login'); // Or replace with '/' if you want to redirect to the homepage
  });
});

// Protected routes using the authentication middleware
app.get('/internalLanding', isAuthenticated, isVolunteer, (req, res) => {
  const eventStatusCounts = knex('event')
    .select('eventstatus')
    .count('eventid as count')
    .groupBy('eventstatus');

  const plannedEvents = knex('event')
    .select(
      'eventstatus',
      'eventdate',
      'eventactivities',
      'city',
      'state',
      'zip',
      'starttime',
      'contactname',
      'organization',
      'startdaterange'
    )
    .where('eventstatus', 'planned')
    .orderBy('eventdate', 'asc')
    .orderBy('startdaterange', 'asc');

  Promise.all([eventStatusCounts, plannedEvents])
    .then(([counts, events]) => {
      const statusCounts = counts.reduce((acc, row) => {
        acc[row.eventstatus] = row.count;
        return acc;
      }, {});

      res.render('internalLanding', { events, statusCounts });
    })
    .catch(error => {
      console.error('Error fetching data for internalLanding:', error);
      res.status(500).send('Internal Server Error');
    });
});

app.get('/adminRedirect', (req, res) => {
  if (req.session && req.session.isAuthenticated && req.session.isAdmin) {
    res.redirect('/internalLanding'); // Redirect to internalLanding if authenticated as admin
  } else if (req.session && req.session.isAuthenticated && req.session.isVolunteer) {
    res.redirect('/volunteerPage'); // Redirect to volunteerPage if authenticated as volunteer
  } else {
    res.redirect('/login'); // Redirect to login if not authenticated
  }
});

// To post the new admin to the database
app.post('/submitAdminForm', isAuthenticated, isAdmin, (req, res) => {
  // Access each value directly from req.body
  const firstname = req.body.FirstName.toLowerCase();
  const lastname = req.body.LastName.toLowerCase();
  const phone = req.body.Phone;
  const email = req.body.Email.toLowerCase();
  const city = req.body.City.toLowerCase();
  const state = req.body.state;
  const howtheyheard = req.body.HowTheyHeard.toLowerCase();
  const sewinglevel = req.body.SewingLevel;
  const monthlyhrswilling = parseInt(req.body.MonthlyHrsWilling); // Convert to integer
  const leadwilling = req.body.LeadWilling;
  const traveltime = parseInt(req.body.TravelTime); // Convert to integer
  const comments = req.body.Comments || 'No comments';
  const username = req.body.username;
  const password = req.body.password;
  const role = req.body.role;

  // Use a transaction to ensure both inserts happen together
  knex.transaction(trx => {
    return trx('volunteer')
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
      .returning('volunteerid') // Return the ID of the inserted volunteer
      .then(volunteerIds => {
        const volunteerId = Array.isArray(volunteerIds) && typeof volunteerIds[0] === 'object'
          ? volunteerIds[0].volunteerid // Extract ID if knex returns an object
          : volunteerIds[0]; // Extract ID if knex returns a plain array

        // Insert the admin record with the foreign key reference to the volunteer
        return trx('admin').insert({
          volunteerid: volunteerId,
          username: username,
          password: password,
          role : role,
        });
      });
  })
    .then(() => {
      res.redirect('/adminRecords'); // Redirect after successful insertion
    })
    .catch(error => {
      console.error('Error adding Admin:', error);
      res.status(500).send('Internal Server Error');
    });
});

 //Route to display events with optional status filter
app.get('/eventRecords', isAdmin, (req, res) => {
  const status = req.query.status; // Extract 'status' from query parameters

  const validStatuses = ['pending', 'approved', 'planned', 'completed'];

   //Start building the query
  let query = knex('event').select('*');

   //Apply filter if a valid status is provided and not 'all'
  if (status && status.toLowerCase() !== 'all' && validStatuses.includes(status.toLowerCase())) {
  query = query.where('eventstatus', status.toLowerCase());
  }

   //Execute the query
  query
    .then(events => {
      res.render('eventRecords', {
        events,
        eventstatus: status ? status.toLowerCase() : 'all', // Pass 'eventstatus' to EJS
      });
    })
    .catch(error => {
      console.error('Error fetching events:', error);
      res.status(500).send('Internal Server Error');
    });
});

// Deletes a admin record
app.post('/deleteAdmin/:volunteerid', isAuthenticated, isAdmin, (req, res) => {
  const volunteerid = parseInt(req.params.volunteerid, 10); // Extract volunteer ID

  knex('admin')
    .where('volunteerid', volunteerid)
    .del()
    .then(() => {
      return knex('admin').where('volunteerid', volunteerid).del();
    })
    .then(() => {
      res.redirect('/adminRecords'); // Redirect after successful deletion
    })
    .catch(error => {
      console.error('Error deleting Admin Record:', error);
      res.status(500).send('Internal Server Error');
    });
});
   

// Deletes a Event
app.post('/deleteEventRec/:eventid', isAuthenticated, isAdmin, (req, res) => {
  const eventid = parseInt(req.params.eventid, 10); // Extract volunteer ID

  knex('event')
    .where('eventid', eventid)
    .del()
    .then(() => {
      // Step 2: Delete the event record
      return knex('event').where('eventid', eventid).del();
    })
    .then(() => {
      res.redirect('/eventRecords'); // Redirect after successful deletion
    })
    .catch(error => {
      console.error('Error deleting Volunteer Record:', error);
      res.status(500).send('Internal Server Error');
    });
});

app.get('/volunteerRecords', isAuthenticated, isAdmin, (req, res) => {
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
    .orderBy('lastname', 'asc')
    .orderBy('firstname', 'asc')
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

//Make save functionality for the volunteer records
app.post('/saveVolunteer/:volunteerid', isAuthenticated, (req, res) => {
  const volunteerid = parseInt(req.params.volunteerid, 10);
  const {
    FirstName,
    LastName,
    Phone,
    Email,
    City,
    state,
    HowTheyHeard,
    SewingLevel,
    MonthlyHrsWilling,
    LeadWilling,
    TravelTime,
    Comments
  } = req.body;

  knex('volunteer')
    .where('volunteerid', volunteerid)
    .update({
      firstname: FirstName.toLowerCase(),
      lastname: LastName.toLowerCase(),
      phone: Phone,
      email: Email.toLowerCase(),
      city: City.toLowerCase(),
      state: state,
      howtheyheard: HowTheyHeard.toLowerCase(),
      sewinglevel: SewingLevel,
      monthlyhrswilling: parseInt(MonthlyHrsWilling),
      leadwilling: LeadWilling,
      traveltime: parseInt(TravelTime),
      comments: Comments || 'No comments'
    })
    .then(() => {
      res.redirect('/volunteerRecords');
    })
    .catch(error => {
      console.error('Error updating volunteer:', error);
      res.status(500).send('Internal Server Error');
    });
});

// Deletes a volunteer and any associated admin records
app.post('/deleteVolunteer/:volunteerid', isAuthenticated, isAdmin, (req, res) => {
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

app.get('/editEventRec/:eventid', isAuthenticated, isAdmin, (req, res) => {
  const eventid = req.params.eventid;

   //Query the Event by eventid
  knex('event')
    .where('eventid', eventid)
    .first()
    .then(event => {
      if (!event) {
        return res.status(404).send('Event not found');
      }
      res.render('editEventRec', { event }); // Pass the event data to the template
    })
    .catch(error => {
      console.error('Error fetching event for editing:', error);
      res.status(500).send('Internal Server Error');
    });
});

app.post('/editEventRec/:eventid', isAuthenticated, isAdmin, (req, res) => {
  const eventid = req.params.eventid;

  // Extract all fields from the request body
  const {
    startdaterange,
    enddaterange,
    expectedparticipants,
    expectedduration,
    eventactivities,
    address,
    city,
    state,
    zip,
    starttime,
    contactname,
    contactphone,
    contactemail,
    jenshare,
    organization,
    comments,
    spacedescription,
    numsewers,
    nummachines,
    numroundtables,
    numrectanglestables,
    numadults,
    numchildren,
    actualparticipants,
    actualduration,
    eventdate,
    pockets,
    collars,
    envelopes,
    vests,
    completedproducts,
    eventstatus,
  } = req.body;

  // Helper function to parse integers or return a default value
  function toIntOrDefault(value, defaultValue) {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  // Define default values for required fields
  const defaultExpectedParticipants = 1; // Example default value
  const defaultExpectedDuration = 1;     // Example default value
  // Add more default values as needed for required fields

  // Input validation for required fields
  const errors = [];

  if (!startdaterange) {
    errors.push('Start date range is required.');
  }

  if (!expectedparticipants) {
    errors.push('Expected participants is required.');
  }

  // Add more validation checks for other required fields
  // For example:
  // if (!address) { errors.push('Address is required.'); }

  if (errors.length > 0) {
    // If there are validation errors, send them back to the client
    res.status(400).json({ errors });
    return;
  }

  // Update the record in the database
  knex('event')
    .where('eventid', eventid)
    .update({
      startdaterange: startdaterange,
      enddaterange: enddaterange || null,
      expectedparticipants: toIntOrDefault(expectedparticipants, defaultExpectedParticipants),
      expectedduration: toIntOrDefault(expectedduration, defaultExpectedDuration),
      eventactivities: eventactivities, // Provide a default empty string if null not allowed
      address: address.toLowerCase() || '',
      city: city.toLowerCase(),
      state: state,
      zip: zip, // Assuming zip is a string
      starttime: starttime || null,
      contactname: contactname.toLowerCase(),
      contactphone: contactphone,
      contactemail: contactemail.toLowerCase(),
      jenshare: jenshare === 'yes', // Convert radio button to boolean
      organization: organization.toLowerCase(),
      comments: comments || '',
      spacedescription: spacedescription.toLowerCase() || '',
      numsewers: toIntOrDefault(numsewers, 0),
      nummachines: toIntOrDefault(nummachines, 0),
      numroundtables: toIntOrDefault(numroundtables, 0),
      numrectanglestables: toIntOrDefault(numrectanglestables, 0),
      numadults: toIntOrDefault(numadults, 0),
      numchildren: toIntOrDefault(numchildren, 0),
      actualparticipants: toIntOrDefault(actualparticipants, 0),
      actualduration: toIntOrDefault(actualduration, 0),
      eventdate: eventdate || null,
      pockets: toIntOrDefault(pockets, 0),
      collars: toIntOrDefault(collars, 0),
      envelopes: toIntOrDefault(envelopes, 0),
      vests: toIntOrDefault(vests, 0),
      completedproducts: toIntOrDefault(completedproducts, 0),
      eventstatus: eventstatus.toLowerCase() || 'pending', // Default to "pending" if not provided
    })
    .then(() => {
      res.redirect('/eventRecords'); // Redirect to the event records page
    })
    .catch((error) => {
      console.error('Error updating event:', error);
      res.status(500).send('Internal Server Error');
    });
});


// Route to display admin records
app.get('/adminRecords', isAuthenticated, isAdmin, (req, res) => {
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
      'admin.password',
      'admin.role'
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

  const state = req.body.state;

  const howtheyheard = req.body.HowTheyHeard;

  const sewinglevel = req.body.SewingLevel;

  const monthlyhrswilling = parseInt(req.body.MonthlyHrsWilling); // Convert to integer

  const leadwilling = req.body.LeadWilling;

  const traveltime = parseInt(req.body.TravelTime); // Convert to integer

  const comments = req.body.Comments || 'No comments';


  // Insert the Volunteer in the database
  knex('volunteer')
    .insert({
      firstname: firstname.toLowerCase(),
      lastname: lastname.toLowerCase(),
      phone: phone,
      email: email.toLowerCase(),
      city: city.toLowerCase(),
      state: state,
      howtheyheard: howtheyheard.toLowerCase(),
      sewinglevel: sewinglevel,
      monthlyhrswilling: monthlyhrswilling,
      leadwilling: leadwilling,
      traveltime: traveltime,
      comments: comments,
    })
    .then(() => {
      if (req.session && req.session.isAuthenticated) {
        res.redirect('/volunteerRecords'); // Redirect to internalLanding if authenticated
      } else {
        res.redirect('/'); // Redirect to login if not authenticated
      }
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

  const eventstatus = "pending"

  // Insert the event in the database
  knex('event')
    .insert({
      startdaterange : startdaterange,
      enddaterange : enddaterange,
      expectedparticipants : expectedparticipants,
      expectedduration :expectedduration,
      eventactivities : eventactivities.toLowerCase(),
      address : address.toLowerCase(),
      city : city.toLowerCase(),
      state : state,
      zip : zip,
      contactname : contactname.toLowerCase(),
      contactphone : contactphone,
      contactemail : contactemail.toLowerCase(),
      jenshare : jenshare,
      organization : organization.toLowerCase(),
      comments : comments,
      eventstatus : eventstatus.toLowerCase(),
    })
    .then(() => {
      if (req.session && req.session.isAuthenticated) {
        res.redirect('/eventRecords'); // Redirect to internalLanding if authenticated
      } else {
        res.redirect('/'); // Redirect to login if not authenticated
      } 
    })
    .catch(error => {
      console.error('Error adding event:', error);
      res.status(500).send('Internal Server Error');
    });
});


// Route to handle newsletter subscription
app.post('/subscribe', (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).send('Email is required');
  }

  // Insert the email into the EmailList table
  knex('emaillist')
    .insert({ email: email.toLowerCase() })
    .then(() => {
      res.send('Thank you for subscribing!');
    })
    .catch(error => {
      console.error('Error subscribing to newsletter:', error);
      res.status(500).send('An error occurred. Please try again later.');
    });
});

// app listening
app.listen(port, () => console.log("Express App has started and server is listening!"));
