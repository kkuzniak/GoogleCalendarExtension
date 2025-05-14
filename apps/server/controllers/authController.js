import express from 'express';
import passport from 'passport';
import { google } from 'googleapis';
import prisma from '../services/prisma.js';
import GoogleStrategy from 'passport-google-oauth20';

const authRouter = express.Router();

authRouter.use(passport.initialize());
authRouter.use(passport.session());

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser(async ({ id }, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    done(null, user);
  } catch (error) {
    done(error);
  }
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      scope: ['email', 'profile', 'https://www.googleapis.com/auth/calendar'],
      accessType: 'offline',
      prompt: 'consent',
    },
    async (accessToken, _, profile, done) => {
      try {
        const email = profile.emails[0].value;
        const userData = {
          accessToken,
          tokenExpiry: new Date(Date.now() + 3600000),
        };

        const user = await prisma.user.upsert({
          where: { email },
          update: userData,
          create: {
            email,
            ...userData,
          },
        });

        done(null, user);
      } catch (error) {
        done(error);
      }
    },
  ),
);

const isAuthenticated = (req, res, next) => {
  const accessToken = req.cookies.accessToken;

  if (!accessToken) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const oauth2Client = new google.auth.OAuth2();

  oauth2Client.setCredentials({
    access_token: accessToken,
  });

  req.oauth2Client = oauth2Client;

  return next();
};

authRouter.route('/google').get(
  passport.authenticate('google', {
    scope: ['email', 'profile', 'https://www.googleapis.com/auth/calendar'],
    accessType: 'offline',
  }),
);

authRouter
  .route('/google/callback')
  .get(passport.authenticate('google', { session: false }), (req, res) => {
    const { accessToken } = req.user;

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60, // 1 hour
    });

    res.redirect(process.env.FRONTEND_URL);
  });

authRouter.route('/check').get(isAuthenticated, async (req, res) => {
  res.status(200).json({ message: 'Authenticated' });
});

export { authRouter, isAuthenticated };
