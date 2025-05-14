import axios from "axios";
import { ENDPOINTS } from "./constants";

export const startWatchingGoogleCalendar = async (month: Date) => { 
  const response = await axios.get(ENDPOINTS.googleCalendar.watch, {
        withCredentials: true,
        params: {
          month,
        },
      });
  
      if (response.status !== 200) {
        throw new Error('Failed to start watching calendar events');
      }
  
  return response.data;
}