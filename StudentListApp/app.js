const express = require('express');
const mysql = require('mysql2');
const multer = require('multer')
const app = express();

// Set up multer for file upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public_student/images'); // Directory to save uploaded file
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

// Function to format date as YYYY-MM-DD
//const date = new Date(student[i].dob); // Convert to date object 
//const day = String(date.getDate()).padStart(2, '0');
//const month = date.toLocaleString('default', { month: 'short' });
//const year = date.getFullYear();
//const formattedDate = `${day} ${month} ${year}`; // Combine and make new variable

const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-indexed
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const upload = multer({ storage: storage });

// Create MySQL connection
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'c237_studentlistapp'
});
connection.connect((err) => {
    if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
    }
    console.log('Connected to MySQL database');
});

// Set up view engine
app.set('view engine', 'ejs');

// enable static files
app.use(express.static('public_student'));

// enable form processing
app.use(express.urlencoded({
    extended: false
}));

// Define routes
app.get('/', (req, res) => {
    const sql = 'SELECT * FROM name';
    // Fetch from Database
    connection.query( sql , (error, results) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error retrieving students');
        }
        // Render HTML page with data
        res.render('index', { student: results });
    });
});

app.get('/student/:id', (req, res) => {
    // Extract the student ID from the request parameters
    const studentId = req.params.id;
    const sql = 'SELECT * FROM name WHERE studentId = ?';       
    // Fetch data from MySQL based on the student ID
    connection.query( sql, [studentId], (error, results) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error retrieving student by ID'); 
        }

        // Check if any product with the given ID was found
        if (results.length > 0) {
            // Render HTML page with the product data
            res.render('student', { student: results[0]});
        } else {
            // If no product with the given ID was found, render a 404 page or handle it accoringly
            res.status(404).send('Student not found');  
        }
    });
});

app.get('/addStudent', (req, res) => {
    res.render('addStudent');
});

app.post('/addStudent', upload.single('image'), (req, res) => {
    // Extract the student data from the request body
    const { name, dob, contact } = req.body;
    let image;
    if (req.file) {
        image = req.file.filename; // Save only the file name
    } else {
        image = null;
    }
    const sql = "INSERT INTO name (name, dob, contact, image) VALUES (?, ?, ?, ?)";
    // Insert the new student into the database
    connection.query ( sql , [name, dob, contact, image], (error, results) => {
        if (error) {
            // Handle any error that occurs during the database operation
            console.error('Error adding student:', error);
            res.status(500).send('Error adding student');
        } else {
            // Send a success response
            res.redirect('/');
        }
    })
})

app.get('/editStudent/:id', (req, res) => {
    const studentId = req.params.id;
    const sql = 'SELECT * FROM name WHERE studentId = ?';
    // Fetch data from MySQL based on the student ID
    connection.query(sql, [studentId], (error, results) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error retrieving student by ID');
        }
        // Check if any student with the given ID was found
        if (results.length > 0) {
            const student = results[0];
            student.dob = formatDate(new Date(student.dob));
            // Render HTML page with the student data
            res.render('editStudent', { student: results[0] });
        } else {
            // If no student with the given ID was found, render a 404 page or handle it accordingly
            res.status(404).send('Student not found');
        }
    });
});

app.post('/editStudent/:id', upload.single('image'), (req, res) => {
    const studentId = req.params.id;
    // Extract student data from the request body
    const { name, dob, contact } = req.body;
    let image = req.body.currentImage; // retrieve the current image filename
    if (req.file) { // if new image is uploaded
        image = req.file.filename; // set image to be new image filename
    }

    const sql = 'UPDATE name SET name = ?, dob = ?, contact = ?, image = ? WHERE studentId = ?'; 

    // Insert the new student into the database
    connection.query(sql, [name, dob, contact, image, studentId], (error, results) => {
        if (error) {
            // Handle any error that occurs during the database operation
            console.error("Error updating student:", error);
            res.status(500).send('Error updating student');
        } else {
            // Send a success response
            res.redirect('/');
        }
    });
});

app.get('/deleteStudent/:id', (req, res) => {
    const studentId = req.params.id;
    const sql = 'DELETE FROM name WHERE studentId = ?';
    connection.query(sql, [studentId], (error, results) => {
        if (error) {
            // Handle any error that occurs during the database operation
            console.error("Error deleting student:", error);
            res.status(500).send('Error deleting student');
        } else {
            // Send a success response
            res.redirect('/');
        }
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));