export type GoogleCalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
};

export type EventsResult = {
  data: {
    events: GoogleCalendarEvent[];
  }
}