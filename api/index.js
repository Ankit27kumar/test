const express = require("express");
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const cors = require("cors");

const dotenv = require("dotenv")
const dotenvExpand = require("dotenv-expand")

const myEnv = dotenv.config();
dotenvExpand.expand(myEnv);


const PORT = process.env.PORT || 3000;
const app = express();
app.use(cors());
app.use(express.json());

const SECRET = process.env.JWT_SECRET;

const adminSchema = new mongoose.Schema({
  username: String,
  password: String,
  journal: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Note' }]
});

const notesSchema = new mongoose.Schema({
  title: String,
  description: String
});

const Admin = mongoose.model('Admin', adminSchema);
const Note = mongoose.model('Note', notesSchema);
try {
  mongoose.connect('mongodb+srv://2022007381ankit:U3xNALvKEojRi5q2@cluster0.etoup5d.mongodb.net/demo1', { useNewUrlParser: true, useUnifiedTopology: true, dbName: "demo1" });

} catch (error) {

  console.log(error);

}


const authenticateJwt = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(' ')[1];

    jwt.verify(token, SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({
          error: true,
          message: "You don't have permission to access this page"
        });
      }

      req.user = user;
      next();
    });
  } else {
    return res.status(401).json({
      error: true,
      message: "Please login to continue"
    });
  }
};


app.get('/api', (req, res) => {
  return res.json({
    'login': '/api/login',
    'register': '/api/signup',
    'addNote': '/api/note',
    'getNote': '/api/getNote',

  })
});

app.post('/api/signup', (req, res) => {
  const { username, password } = req.body;
  function callback(admin) {
    if (admin) {
      res.status(403).json({ message: 'Admin already exists' });
    } else {
      const obj = { username: username, password: password };
      const newAdmin = new Admin(obj);
      newAdmin.save();
      const token = jwt.sign({ username, role: 'admin' }, SECRET, { expiresIn: '1h' });
      res.json({ message: 'Admin created successfully', token });
    }

  }
  Admin.findOne({ username }).then(callback);
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const admin = await Admin.findOne({ username, password });
  if (admin) {
    const token = jwt.sign({ username, role: 'admin' }, SECRET, { expiresIn: '1h' });
    res.json({ message: 'Logged in successfully', token });
  } else {
    res.status(403).json({ message: 'Invalid username or password' });
  }
});

app.post('/api/note', authenticateJwt, async (req, res) => {
  const { title, description } = new Note(req.body);
  const obj = { title: title, description: description };
  const newnote = new Note(obj);
  newnote.save();

  const admin = await Admin.findOne({ username: req.user.username });
  if (admin) {
    admin.journal.push(newnote);
    await admin.save();
    // Send back the newly added note in the response
    res.status(200).json(newnote); // Assuming newnote contains the newly added note data
  } else {
    res.status(403).json({ message: 'User not found' });
  }
});


app.get('/api/getnote', authenticateJwt, async (req, res) => {
  const user = req.user.username;
  const admin = await Admin.findOne({ username: user }).populate('journal');
  const journal = admin.journal;
  res.json({ journal });
});
app.get("/api/admin/me", authenticateJwt, async (res, req) => {
  res.send(req.user);
})


app.delete("/api/delete/:noteId", authenticateJwt, async (req, res) => {
  const noteId = req.params.noteId;

  try {
    await Note.deleteOne({ _id: noteId });
    console.log('Note deleted successfully');
    res.status(200).send('Note deleted successfully');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error deleting note');
  }
});

app.get('*', (req, res) => {
  return res.json({
    error: true,
    message: '404 error'
  })
});


app.post('*', (req, res) => {
  return res.json({
    error: true,
    message: '404 error'
  })
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`)
})
