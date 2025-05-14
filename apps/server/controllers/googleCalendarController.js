import express from 'express';
import { google } from 'googleapis';
import prisma from '../services/prisma.js';
import { v4 as uuid } from 'uuid';
import { addMonths, endOfMonth, startOfMonth, subMonths } from 'date-fns';
import { getNgrokUrl } from '../utils.js';
import { isAuthenticated } from './authController.js';
import { io } from '../app.js';

const googleCalendarRouter = express.Router();

googleCalendarRouter.route('/watch').get(isAuthenticated, async (req, res) => {
  const { month } = req.query;
  const { oauth2Client } = req;
  const { access_token: accessToken } = oauth2Client.credentials;

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  try {
    const ngrokUrl = await getNgrokUrl();
    const user = await prisma.user.findUnique({
      where: { accessToken },
      include: {
        watchChannel: true,
      },
    });

    if (user?.watchChannel?.id) {
      await prisma.watchChannel.delete({
        where: { id: user.watchChannel.id },
      });

      await calendar.channels.stop({
        requestBody: {
          id: user.watchChannel.id,
          resourceId: user.watchChannel.resourceId,
        },
      });
    }

    const channelId = uuid();

    const watchResponse = await calendar.events.watch({
      calendarId: 'primary',
      requestBody: {
        id: channelId,
        type: 'web_hook',
        address: `${ngrokUrl}/google-calendar/update`,
        expiration: Date.now() + 60 * 60 * 1000, // 1 hour
      },
    });

    const channelData = {
      resourceId: watchResponse.data.resourceId,
      expiration: new Date(Number(watchResponse.data.expiration)),
      month: new Date(month),
      userId: user.id,
    };

    await prisma.watchChannel.upsert({
      where: { id: channelId },
      update: channelData,
      create: {
        id: channelId,
        ...channelData,
      },
    });

    const monthDate = new Date(month);
    const timeMin = startOfMonth(monthDate).toISOString();
    const timeMax = endOfMonth(monthDate).toISOString();

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'updated',
    });

    const items = response.data.items.map(event => ({
      id: event.id,
      status: event.status,
      title: event.summary,
      organizer: event.organizer.email,
      start: event.start.dateTime || event.start.date,
      end: event.end.dateTime || event.end.date,
      createdAt: event.created,
      updatedAt: event.updated,
    }));

    for (const event of items) {
      const eventData = {
        status: event.status,
        title: event.title,
        organizer: event.organizer,
        start: new Date(event.start),
        end: new Date(event.end),
        createdAt: new Date(event.createdAt),
        updatedAt: new Date(event.updatedAt),
      };

      await prisma.calendarEvent.upsert({
        where: { id: event.id },
        update: eventData,
        create: {
          id: event.id,
          ...eventData,
        },
      });
    }

    io.emit('calendar-update', {
      type: 'update',
      data: {
        events: items,
      },
    });

    res.status(200).json({ message: 'Watch channel set up successfully' });
  } catch (error) {
    console.error('Error setting up watch channel:', error);
    res.status(500).json({ error: 'Error setting up watch channel' });
  }
});

googleCalendarRouter.route('/update').post(async (req, res) => {
  try {
    const oauth2Client = new google.auth.OAuth2();
    const resourceId = req.headers['x-goog-resource-id'];
    const watchChannel = await prisma.watchChannel.findUnique({
      where: { resourceId },
      include: {
        user: true,
      },
    });

    if (!watchChannel) {
      return res.status(400).send('Invalid channel');
    }

    if (!watchChannel.user) {
      return res.status(401).send('No authenticated user found');
    }

    oauth2Client.setCredentials({
      access_token: watchChannel.user.accessToken,
      refresh_token: watchChannel.user.refreshToken,
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const timeMin = startOfMonth(
      subMonths(watchChannel.month, 1),
    ).toISOString();
    const timeMax = endOfMonth(addMonths(watchChannel.month, 1)).toISOString();

    const googleEvents = await calendar.events.list({
      calendarId: 'primary',
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'updated',
    });

    const items = googleEvents.data.items.map(event => ({
      id: event.id,
      status: event.status,
      title: event.summary,
      organizer: event.organizer.email,
      start: event.start.dateTime || event.start.date,
      end: event.end.dateTime || event.end.date,
      createdAt: event.created,
      updatedAt: event.updated,
    }));

    const databaseEvents = await prisma.calendarEvent.findMany({
      where: {
        start: {
          gte: new Date(timeMin),
        },
        end: {
          lte: new Date(timeMax),
        },
      },
    });
    const googleIds = new Set(googleEvents.data.items.map(event => event.id));
    const databaseIds = new Set(databaseEvents.map(event => event.id));
    const deletedIds = [...databaseIds].filter(id => !googleIds.has(id));

    for (const event of items) {
      const eventData = {
        status: event.status,
        title: event.title,
        organizer: event.organizer,
        start: new Date(event.start),
        end: new Date(event.end),
        createdAt: new Date(event.createdAt),
        updatedAt: new Date(event.updatedAt),
      };

      await prisma.calendarEvent.upsert({
        where: { id: event.id },
        update: eventData,
        create: {
          id: event.id,
          ...eventData,
        },
      });
    }

    for (const id of deletedIds) {
      await prisma.calendarEvent.delete({
        where: { id },
      });
    }

    io.emit('calendar-update', {
      type: 'update',
      data: {
        events: items,
      },
    });

    res.send('Webhook processed successfully');
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).send('Error processing webhook');
  }
});

export { googleCalendarRouter };
