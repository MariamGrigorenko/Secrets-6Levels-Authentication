// Requiring NPM
require("dotenv").config(); // has to be required as first of all
const express = require("express"); // should be required as second one
const bodyParser = require("body-parser");
const ejs = require("ejs"); // has to be installed, but doesn't necessarily need to be required
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
// const passportLocal = require("passport-local"); has to be installed, but doesn't need to be required
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const findOrCreate = require("mongoose-findorcreate");

// Setting up express
const app = express();

// Setting up PORT
const PORT = process.env.PORT || 4000;

// Setting up static folder
app.use(express.static(__dirname + "/public"));

// Setting up EJS
app.set("view engine", "ejs");

// Setting up body-parser
app.use(bodyParser.urlencoded({ extended: true }));

// Setting up express-session
app.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false
  })
);

// Setting up passport
app.use(passport.initialize());
app.use(passport.session());

// Connecting mongoose to a database
mongoose.set("strictQuery", true); // Avoids warnings in terminal
mongoose.connect("mongodb://127.0.0.1:27017/userDB");

// Creating mongoose user schema
const userSchema = new mongoose.Schema({
  googleId: {
    type: String,
    unique: true
  },
  facebookId: {
    type: String,
    unique: true
  },
  username: String,
  email: String,
  password: String,
  secret: String
});

// Adding plugins to the user schema
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

// Modeling the user schema
const User = mongoose.model("User", userSchema);

// Adding some passport methods to the user schema
passport.use(User.createStrategy());

passport.serializeUser((user, cb) => {
  process.nextTick(() => {
    cb(null, { id: user.id, username: user.username });
  });
});

passport.deserializeUser((user, cb) => {
  process.nextTick(() => {
    return cb(null, user);
  });
});

// Connecting passport with google credentials
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: "http://localhost:4000/auth/google/secrets"
    },
    (accessToken, refreshToken, profile, cb) => {
      User.findOrCreate({ googleId: profile.id }, (err, user) => {
        return cb(err, user);
      });
    }
  )
);

// Connecting passport with facebook
passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: "http://localhost:4000/auth/facebook/secrets"
    },
    function (accessToken, refreshToken, profile, cb) {
      User.findOrCreate({ facebookId: profile.id }, function (err, user) {
        return cb(err, user);
      });
    }
  )
);

// Home route
app.route("/").get((req, res) => {
  res.render("home");
});

// Google authentication route
app
  .route("/auth/google")
  .get(passport.authenticate("google", { scope: ["profile"] }));

// Google authentication callback route
app
  .route("/auth/google/secrets")
  .get(
    passport.authenticate("google", { failureRedirect: "/login" }),
    (req, res) => {
      res.redirect("/secrets");
    }
  );

// Facebook authentication route
app.route("/auth/facebook").get(passport.authenticate("facebook"));

// Facebook authentication callback route
app
  .route("/auth/facebook/secrets")
  .get(
    passport.authenticate("facebook", { failureRedirect: "/login" }),
    function (req, res) {
      res.redirect("/secrets");
    }
  );

// Register route
app
  .route("/register")
  .get((req, res) => {
    res.render("register");
  })
  .post((req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    User.register({ username: username }, password, (err, user) => {
      if (err) {
        console.log(err);
        res.redirect("/register");
      } else {
        passport.authenticate("local")(req, res, () => {
          res.redirect("/secrets");
        });
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
    const user = new User({
      username: req.body.username,
      password: req.body.password
    });
    req.login(user, (err) => {
      if (err) {
        console.log(err);
      } else {
        passport.authenticate("local")(req, res, () => {
          res.redirect("/secrets");
        });
      }
    });
  });

// Secrets route
app.route("/secrets").get((req, res) => {
  // if (req.isAuthenticated()) {
  //   res.render("secrets");
  // } else {
  //   res.redirect("/");
  // }
  User.find({ secret: { $ne: null } }, function (err, foundUsers) {
    if (err) {
      console.log(err);
    } else {
      if (foundUsers) {
        res.render("secrets", { usersWithSecrets: foundUsers });
      } else {
        console.log(err);
      }
    }
  });
});

// Submit secrets route
app
  .route("/submit")
  .get((req, res) => {
    if (req.isAuthenticated()) {
      res.render("submit");
    } else {
      res.redirect("/");
    }
  })
  .post((req, res) => {
    const submittedSecret = req.body.secret;
    User.findById(req.user.id, (err, foundUser) => {
      if (err) {
        console.log(err);
      } else {
        if (foundUser) {
          foundUser.secret = submittedSecret;
          foundUser.save(() => {
            res.redirect("/secrets");
          });
        }
      }
    });
  });

// Logout route
app.route("/logout").post((req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    } else {
      res.redirect("/");
    }
  });
});

// Set up server
app.listen(PORT, () => {
  console.log("Server is runnig on port " + PORT + ".");
});
