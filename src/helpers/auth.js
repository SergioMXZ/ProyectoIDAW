"use strict";
const helpers = {};

const isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated() || req.user) {
    console.log("Autenticado:", req.user);
    return next();
  }
  console.log("No Autenticado:", req.user);
  res.redirect("/");
};

module.exports = {
  isLoggedIn,
};
