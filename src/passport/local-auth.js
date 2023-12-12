const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;

const User = require("../models/user");

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  const user = await User.findById(id);
  done(null, user);
});

passport.use(
  "local-signup",
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
      passReqToCallback: true,
    },
    async (req, email, password, done) => {
      const user = await User.findOne({ email: email });
      const { nombre } = req.body;
      console.log(user);
      if (user) {
        console.log("no creado");
        return done(null, false, {
          message: ("error", "This email has already been registered."),
        });
      } else {
        const newUser = new User();
        newUser.email = email;
        newUser.password = newUser.encryptPassword(password);
        newUser.nombre = nombre;
        console.log(newUser);
        await newUser.save();
        console.log("creado");
        done(null, newUser, { successMessages: ("success", "Welcome back.") });
      }
    }
  )
);

passport.use(
  "local-signin",
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
      passReqToCallback: true,
    },
    async (req, email, password, done) => {
      const user = await User.findOne({ email: email });
      // borrar(pa que quieres que salga en la consola)
      console.log("Validacion user" + user); // <---
      if (!user || !user.comparePassword(password)) {
        console.log("no logeado");
        return done(null, false, {
          message: "Invalid login, please try again.",
        });
      }
      console.log("logeado");
      return done(null, user);
    }
  )
);
