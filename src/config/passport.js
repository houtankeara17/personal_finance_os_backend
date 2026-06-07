/**
 * @file passport.js
 * @description Passport Google & GitHub OAuth strategies.
 *   Place this file at: src/config/passport.js
 *
 * Required env vars:
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
 *   GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET
 *   CLIENT_URL  (your React dev/prod URL e.g. http://localhost:5173)
 */

const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/User");

// ─── Google ──────────────────────────────────────────────────────────────────
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/api/auth/google/callback",
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value?.toLowerCase();

        // 1. Already has a Google-linked account → return it
        let user = await User.findOne({ googleId: profile.id });
        if (user) return done(null, user);

        // 2. Same email exists (local account) → link Google to it
        if (email) {
          user = await User.findOne({ email });
          if (user) {
            user.googleId = profile.id;
            if (!user.avatar && profile.photos?.[0]?.value) {
              user.avatar = profile.photos[0].value;
            }
            await user.save();
            return done(null, user);
          }
        }

        // 3. Brand new user → create account (no password)
        user = await User.create({
          name: profile.displayName || "Google User",
          email: email || `google_${profile.id}@noemail.invalid`,
          googleId: profile.id,
          authProvider: "google",
          avatar: profile.photos?.[0]?.value || "",
        });

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    },
  ),
);

// Passport session serialization — not used (we use JWT), but required by passport
passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;
