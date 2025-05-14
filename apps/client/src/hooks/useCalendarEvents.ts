import { useMutation } from "@tanstack/react-query"
import { useEffect, useState } from "react";
import { socketService } from "../services/socket";
import { startWatchingGoogleCalendar } from "../services/googleCalendar";
import type { GoogleCalendarEvent } from "../types";

const useCalendarEvents = (month: Date) =>{
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([]);

  const eventsQuery = useMutation({
    mutationFn: () => startWatchingGoogleCalendar(month),
    onSuccess: () => console.log('Started watching calendar events'),
    onError: () => console.log('Failed to start watching calendar events'),
  })

  useEffect(() => {
    socketService.connect();
    eventsQuery.mutate();

    socketService.onCalendarUpdate((result) => {
      if (!result.data.events) {
        return;
      }

      const events = result.data.events.map(({ id, title, start, end }: GoogleCalendarEvent) => ({
        id,
        title,
        start, 
        end,
      }));

      setEvents(events);
    })

    return () => {
      socketService.disconnect();
    }
  }, []);

  return { events };
}

export { useCalendarEvents}