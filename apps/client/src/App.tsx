import { authWithGoogle } from "./services/auth";
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import { useAuth } from "./hooks/useAuth";
import { useCalendarEvents } from "./hooks/useCalendarEvents";

function App() {
  const { isAuthenticated } = useAuth();
  const { events } = useCalendarEvents(new Date());

  return (
    <div className="size-full flex items-center justify-center">
      {isAuthenticated ? (
        <div className="size-full p-10">
          <FullCalendar
            plugins={[dayGridPlugin]}
            initialView="dayGridMonth"
            events={events}
            height="100%"
          />
        </div>
      ) : (
        <button className="bg-blue-500 text-white p-2 rounded-md cursor-pointer" onClick={authWithGoogle}>Login with Google</button>
      )}
    </div>
  );
}

export default App;