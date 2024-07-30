const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const app = express();
const multer = require('multer');

// Configure storage for uploaded files
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Initialize multer with the storage configuration
const upload = multer({ storage: storage });

// Create MySQL connection
const connection = mysql.createConnection({
    host: 'what-weird-waffles.chnxzoecdsff.us-east-1.rds.amazonaws.com',
    user: 'kayaducktective',
    password: 'Passw0rdsnakesRP',
    database: 'whatweirdwaffles'
});

connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Set the view engine to EJS
app.set('view engine', 'ejs');

// Enable form processing
app.use(express.urlencoded({ extended: false }));

// Define your quiz questions array with points
const quizQuestions = [
    { question: "What's your favorite waffle topping?", options: [{ text: "Syrup", points: 1 }, { text: "Butter", points: 2 }, { text: "Fruit", points: 3 }, { text: "Whipped Cream", points: 4 }] },
    { question: "How do you like your waffles cooked?", options: [{ text: "Crispy", points: 1 }, { text: "Soft", points: 2 }, { text: "Golden", points: 3 }, { text: "Burnt", points: 4 }] },
    { question: "What time of day do you prefer waffles?", options: [{ text: "Breakfast", points: 1 }, { text: "Lunch", points: 2 }, { text: "Dinner", points: 3 }, { text: "Dessert", points: 4 }] },
    { question: "What's your favorite waffle flavor?", options: [{ text: "Blueberry", points: 1 }, { text: "Mala", points: 2 }, { text: "Nutella", points: 3 }, { text: "Plain", points: 4 }] }
];

// Helper function to determine waffle type based on total points
function determineWaffleType(totalPoints) {
    if (totalPoints <= 5) {
        return { type: "Blueberry", description: "You are sweet and wholesome, just like a blueberry waffle!" };
    } else if (totalPoints <= 10) {
        return { type: "Mala", description: "You have a spicy and adventurous personality, much like a Mala waffle!" };
    } else if (totalPoints <= 15) {
        return { type: "Nutella", description: "You're rich and indulgent, with a love for the finer things in life, like a Nutella waffle!" };
    } else {
        return { type: "Plain", description: "You are simple and classic, appreciating the basics, just like a plain waffle." };
    }
}

// Define routes
app.get('/', (req, res) => {
    const sqlComments = 'SELECT * FROM comment';
    const sqlEntries = 'SELECT * FROM entry';

    // Fetch comments and entries from the database
    connection.query(sqlComments, (error, comments) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error retrieving comments');
        }

        connection.query(sqlEntries, (error, entries) => {
            if (error) {
                console.error('Database query error:', error.message);
                return res.status(500).send('Error retrieving entries');
            }

            // Render HTML page with comments, entries, and quiz questions
            res.render('index', { comments: comments, entries: entries, quizQuestions: quizQuestions });
        });
    });
});

app.get('/addComment', (req, res) => {
    res.render('addComment');
});

app.post('/addComment', (req, res) => {
    const { username, pfp, waffletype, comment } = req.body;
    const sql = 'INSERT INTO comment (username, pfp, waffletype, comment) VALUES (?, ?, ?, ?)';
    connection.query(sql, [username, pfp, waffletype, comment], (error, results) => {
        if (error) {
            console.error('Database insert error:', error.message);
            return res.status(500).send('Error adding comment');
        }
        res.redirect('/');
    });
});

app.get('/editComment/:commentId', (req, res) => {
    const { commentId } = req.params;
    const sql = 'SELECT * FROM comment WHERE commentId = ?';
    connection.query(sql, [commentId], (error, results) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error retrieving comment');
        }
        if (results.length > 0) {
            res.render('editComment', { comment: results[0] });
        } else {
            res.status(404).send('Comment not found');
        }
    });
});

app.post('/editComment/:commentId', (req, res) => {
    const { commentId } = req.params;
    const { username, pfp, waffletype, comment } = req.body;
    const sql = 'UPDATE comment SET username = ?, pfp = ?, waffletype = ?, comment = ? WHERE commentId = ?';
    connection.query(sql, [username, pfp, waffletype, comment, commentId], (error, results) => {
        if (error) {
            console.error('Database update error:', error.message);
            return res.status(500).send('Error updating comment');
        }
        res.redirect('/');
    });
});

app.get('/deleteComment/:commentId', (req, res) => {
    const { commentId } = req.params;
    const sql = 'DELETE FROM comment WHERE commentId = ?';
    connection.query(sql, [commentId], (error, results) => {
        if (error) {
            console.error('Database delete error:', error.message);
            return res.status(500).send('Error deleting comment');
        }
        res.redirect('/');
    });
});

app.get('/addEntry', (req, res) => {
    res.render('addEntry');
});

app.post('/addEntry', upload.single('entryimage'), (req, res) => {
    const { username, entryname, entrydescription } = req.body;
    const entryimage = req.file ? '/uploads/' + req.file.filename : null;
    const sql = 'INSERT INTO entry (username, entryname, entrydescription, entryimage) VALUES (?, ?, ?, ?)';
    connection.query(sql, [username, entryname, entrydescription, entryimage], (error, results) => {
        if (error) {
            console.error('Database insert error:', error.message);
            return res.status(500).send('Error adding entry');
        }
        res.redirect('/');
    });
});


app.post('/editEntry/:id', upload.single('entryimage'), (req, res) => {
    const { id } = req.params;
    const { username, entryname, entrydescription } = req.body;
    const entryimage = req.file ? '/uploads/' + req.file.filename : null;

    let sql;
    let params;

    if (entryimage) {
        sql = 'UPDATE entry SET username = ?, entryname = ?, entrydescription = ?, entryimage = ? WHERE entryId = ?';
        params = [username, entryname, entrydescription, entryimage, id];
    } else {
        sql = 'UPDATE entry SET username = ?, entryname = ?, entrydescription = ? WHERE entryId = ?';
        params = [username, entryname, entrydescription, id];
    }

    connection.query(sql, params, (error, results) => {
        if (error) {
            console.error('Database update error:', error.message);
            return res.status(500).send('Error updating entry');
        }
        res.redirect('/');
    });
});


app.post('/editEntry/:entryId', (req, res) => {
    const { entryId } = req.params;
    const { username, entryname, entrydescription, entryimage } = req.body;
    const sql = 'UPDATE entry SET username = ?, entryname = ?, entrydescription = ?, entryimage = ? WHERE entryId = ?';
    connection.query(sql, [username, entryname, entrydescription, entryimage, entryId], (error, results) => {
        if (error) {
            console.error('Database update error:', error.message);
            return res.status(500).send('Error updating entry');
        }
        res.redirect('/');
    });
});

app.get('/editEntry/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'SELECT * FROM entry WHERE entryId = ?';
    connection.query(sql, [id], (error, results) => {
        if (error) {
            console.error('Database select error:', error.message);
            return res.status(500).send('Error retrieving entry');
        }
        if (results.length > 0) {
            res.render('editEntry', { entry: results[0] });
        } else {
            res.status(404).send('Entry not found');
        }
    });
});

app.post('/editEntry/:id', upload.single('entryimage'), (req, res) => {
    const { id } = req.params;
    const { username, entryname, entrydescription } = req.body;
    const entryimage = req.file ? '/uploads/' + req.file.filename : null;

    let sql;
    let params;

    if (entryimage) {
        sql = 'UPDATE entry SET username = ?, entryname = ?, entrydescription = ?, entryimage = ? WHERE entryId = ?';
        params = [username, entryname, entrydescription, entryimage, id];
    } else {
        sql = 'UPDATE entry SET username = ?, entryname = ?, entrydescription = ? WHERE entryId = ?';
        params = [username, entryname, entrydescription, id];
    }

    connection.query(sql, params, (error, results) => {
        if (error) {
            console.error('Database update error:', error.message);
            return res.status(500).send('Error updating entry');
        }
        res.redirect('/');
    });
});

app.get('/deleteEntry/:entryId', (req, res) => {
    const { entryId } = req.params;
    const sql = 'DELETE FROM entry WHERE entryId = ?';
    connection.query(sql, [entryId], (error, results) => {
        if (error) {
            console.error('Database delete error:', error.message);
            return res.status(500).send('Error deleting entry');
        }
        res.redirect('/');
    });
});

app.get('/search', (req, res) => {
    const query = req.query.query.toLowerCase();

    // Define the SQL queries
    const sqlComments = 'SELECT * FROM comment WHERE LOWER(username) LIKE ? OR LOWER(comment) LIKE ? OR LOWER(waffletype) LIKE ?';
    const sqlEntries = 'SELECT * FROM entry WHERE LOWER(username) LIKE ? OR LOWER(entryname) LIKE ? OR LOWER(entrydescription) LIKE ?';

    // Execute the comments query
    connection.query(sqlComments, [`%${query}%`, `%${query}%`, `%${query}%`], (error, comments) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error retrieving comments');
        }

        // Execute the entries query
        connection.query(sqlEntries, [`%${query}%`, `%${query}%`, `%${query}%`], (error, entries) => {
            if (error) {
                console.error('Database query error:', error.message);
                return res.status(500).send('Error retrieving entries');
            }

            // Render the results
            res.render('index', { comments: comments, entries: entries, quizQuestions: quizQuestions });
        });
    });
});

app.post('/submitQuiz', (req, res) => {
    let totalPoints = 0;
    const answers = Object.values(req.body);
    answers.forEach(answer => {
        totalPoints += parseInt(answer, 10);
    });

    const result = determineWaffleType(totalPoints);

    res.render('quizResult', { waffleType: result.type, description: result.description });
});

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
