import axios from 'axios';
import { google } from 'googleapis';
import prisma from './services/prisma.js';

export const getNgrokUrl = async () => {
  try {
    const response = await axios.get('http://ngrok:4040/api/tunnels');
    const tunnels = response.data.tunnels;

    if (!tunnels || tunnels.length === 0) {
      throw new Error('No ngrok tunnels found');
    }

    const httpsTunnel = tunnels.find(tunnel => tunnel.proto === 'https');

    if (!httpsTunnel) {
      throw new Error('No HTTPS tunnel found');
    }

    return httpsTunnel.public_url;
  } catch (error) {
    console.error('Error getting ngrok URL:', error);
    throw error;
  }
};

export const cleanupConnections = async () => {
  console.log('Cleaning up connections...');

  try {
    const watchChannels = await prisma.watchChannel.findMany({
      include: {
        user: true,
      },
    });

    for (const channel of watchChannels) {
      try {
        const oauth2Client = new google.auth.OAuth2();

        oauth2Client.setCredentials({
          access_token: channel.user.accessToken,
          refresh_token: channel.user.refreshToken,
        });

        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        await calendar.channels.stop({
          requestBody: {
            id: channel.id,
            resourceId: channel.id,
          },
        });

        await prisma.watchChannel.delete({ where: { id: channel.id } });

        console.log(`Stopped and deleted channel ${channel.id}`);
      } catch (error) {
        console.error(`Error stopping channel ${channel.id}:`, error);
      }
    }

    await prisma.$disconnect();

    console.log('All watch channels stopped and deleted');
    process.exit(0);
  } catch (error) {
    console.error('Error cleaning up watch channels:', error);
    process.exit(1);
  }
};
