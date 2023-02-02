// dotenv
require('dotenv').config()

// Express
const express = require("express");
const app = express();

// Body Parser
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: true }));

// Static Folder
app.use(express.static(__dirname + "/public"));

// EJS (Should be placed after "const app = express()" was created)
app.set("view engine", "ejs");

// PORT
const PORT = process.env.PORT || 4000;

// Mongoose
const mongoose = require("mongoose");

// Mongoose encryption
encrypt = require("mongoose-encryption");

// Connecting mongoose to a database
mongoose.set("strictQuery", true);
mongoose.connect("mongodb://127.0.0.1:27017/userDB");

// Mongoose schema
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
});

userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ["password"] });

const User = mongoose.model("User", userSchema);

// Home route
app.route("/").get((req, res) => {
  res.render("home");
});

// Register route
app
  .route("/register")
  .get((req, res) => {
    res.render("register");
  })
  .post((req, res) => {
    const newUser = new User({
      email: req.body.username,
      password: req.body.password,
    });
    newUser.save((err) => {
      if (err) {
        console.log(err);
      } else {
        res.render("secrets");
      }
    });
  });

// Login route
app
  .route("/login")
  .get((req, res) => {
    res.render("login");
  })
  .post((req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    User.findOne({ email: username }, (err, foundUser) => {
      if (err) {
        console.log(err);
      } else {
        if (foundUser) {
          if (foundUser.password === password) {
            res.render("secrets");
          }
        }
      }
    });
  });

// Set up server
app.listen(PORT, () => {
  console.log("Server is runnig on port " + PORT + ".");
});
