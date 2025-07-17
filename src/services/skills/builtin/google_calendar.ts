import { createGoogleCalendarClient } from '../google_auth_service';
import type { SkillExecutionContext } from '../skill-executor-v2';

export const GOOGLE_CALENDAR_SKILL_DEFINITIONS = [
  {
    name: 'google_calendar_list_calendars',
    display_name: 'List Google Calendars',
    description: 'List all calendars accessible by the user.',
    category: 'google_calendar',
    type: 'builtin',
    is_active: true,
    user_id: null,
    function_schema: {
      name: 'google_calendar_list_calendars',
      description: 'List all calendars accessible by the user.',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    },
    configuration: {},
  },
  {
    name: 'google_calendar_list_events',
    display_name: 'List Calendar Events',
    description: 'List events in a calendar, optionally filtered by time range.',
    category: 'google_calendar',
    type: 'builtin',
    is_active: true,
    user_id: null,
    function_schema: {
      name: 'google_calendar_list_events',
      description: 'List events in a calendar, optionally filtered by time range.',
      parameters: {
        type: 'object',
        properties: {
          calendarId: { type: 'string', description: 'ID of the calendar to list events from', example: 'primary' },
          timeMin: { type: 'string', description: 'RFC3339 start time (inclusive)', example: '2024-07-01T00:00:00Z' },
          timeMax: { type: 'string', description: 'RFC3339 end time (exclusive)', example: '2024-07-31T23:59:59Z' },
          maxResults: { type: 'integer', description: 'Maximum number of events to return', example: 20 },
          q: { type: 'string', description: 'Free text search query', example: 'meeting' }
        },
        required: ['calendarId']
      }
    },
    configuration: {},
  },
  {
    name: 'google_calendar_get_event',
    display_name: 'Get Calendar Event',
    description: 'Get details for a specific calendar event.',
    category: 'google_calendar',
    type: 'builtin',
    is_active: true,
    user_id: null,
    function_schema: {
      name: 'google_calendar_get_event',
      description: 'Get details for a specific calendar event.',
      parameters: {
        type: 'object',
        properties: {
          calendarId: { type: 'string', description: 'ID of the calendar', example: 'primary' },
          eventId: { type: 'string', description: 'ID of the event', example: 'abc123' }
        },
        required: ['calendarId', 'eventId']
      }
    },
    configuration: {},
  },
  {
    name: 'google_calendar_create_event',
    display_name: 'Create Calendar Event',
    description: 'Create a new event in a calendar.',
    category: 'google_calendar',
    type: 'builtin',
    is_active: true,
    user_id: null,
    function_schema: {
      name: 'google_calendar_create_event',
      description: 'Create a new event in a calendar.',
      parameters: {
        type: 'object',
        properties: {
          calendarId: { type: 'string', description: 'ID of the calendar', example: 'primary' },
          event: { type: 'object', description: 'Event object (Google Calendar API v3 format)', example: { summary: 'Team Meeting', start: { dateTime: '2024-07-10T10:00:00Z' }, end: { dateTime: '2024-07-10T11:00:00Z' } } }
        },
        required: ['calendarId', 'event']
      }
    },
    configuration: {},
  },
  {
    name: 'google_calendar_update_event',
    display_name: 'Update Calendar Event',
    description: 'Update an existing calendar event.',
    category: 'google_calendar',
    type: 'builtin',
    is_active: true,
    user_id: null,
    function_schema: {
      name: 'google_calendar_update_event',
      description: 'Update an existing calendar event.',
      parameters: {
        type: 'object',
        properties: {
          calendarId: { type: 'string', description: 'ID of the calendar', example: 'primary' },
          eventId: { type: 'string', description: 'ID of the event', example: 'abc123' },
          event: { type: 'object', description: 'Updated event object (Google Calendar API v3 format)', example: { summary: 'Updated Meeting', start: { dateTime: '2024-07-10T10:00:00Z' }, end: { dateTime: '2024-07-10T11:00:00Z' } } }
        },
        required: ['calendarId', 'eventId', 'event']
      }
    },
    configuration: {},
  },
  {
    name: 'google_calendar_delete_event',
    display_name: 'Delete Calendar Event',
    description: 'Delete an event from a calendar.',
    category: 'google_calendar',
    type: 'builtin',
    is_active: true,
    user_id: null,
    function_schema: {
      name: 'google_calendar_delete_event',
      description: 'Delete an event from a calendar.',
      parameters: {
        type: 'object',
        properties: {
          calendarId: { type: 'string', description: 'ID of the calendar', example: 'primary' },
          eventId: { type: 'string', description: 'ID of the event', example: 'abc123' }
        },
        required: ['calendarId', 'eventId']
      }
    },
    configuration: {},
  },
  {
    name: 'google_calendar_rsvp_event',
    display_name: 'RSVP to Calendar Event',
    description: 'RSVP or respond to a calendar event invitation.',
    category: 'google_calendar',
    type: 'builtin',
    is_active: true,
    user_id: null,
    function_schema: {
      name: 'google_calendar_rsvp_event',
      description: 'RSVP or respond to a calendar event invitation.',
      parameters: {
        type: 'object',
        properties: {
          calendarId: { type: 'string', description: 'ID of the calendar', example: 'primary' },
          eventId: { type: 'string', description: 'ID of the event', example: 'abc123' },
          attendeeEmail: { type: 'string', description: 'Email of the attendee responding', example: 'user@example.com' },
          responseStatus: { type: 'string', description: 'RSVP status (accepted, declined, tentative)', enum: ['accepted', 'declined', 'tentative'], example: 'accepted' }
        },
        required: ['calendarId', 'eventId', 'attendeeEmail', 'responseStatus']
      }
    },
    configuration: {},
  },
  {
    name: 'google_calendar_search_events',
    display_name: 'Search Calendar Events',
    description: 'Search for events in a calendar by keyword, attendee, etc.',
    category: 'google_calendar',
    type: 'builtin',
    is_active: true,
    user_id: null,
    function_schema: {
      name: 'google_calendar_search_events',
      description: 'Search for events in a calendar by keyword, attendee, etc.',
      parameters: {
        type: 'object',
        properties: {
          calendarId: { type: 'string', description: 'ID of the calendar', example: 'primary' },
          q: { type: 'string', description: 'Free text search query', example: 'project review' },
          timeMin: { type: 'string', description: 'RFC3339 start time (inclusive)', example: '2024-07-01T00:00:00Z' },
          timeMax: { type: 'string', description: 'RFC3339 end time (exclusive)', example: '2024-07-31T23:59:59Z' },
          maxResults: { type: 'integer', description: 'Maximum number of events to return', example: 20 }
        },
        required: ['calendarId', 'q']
      }
    },
    configuration: {},
  },
];

export const GOOGLE_CALENDAR_SKILL_IMPLEMENTATIONS = {
  // List all calendars accessible by the user
  async google_calendar_list_calendars(params: any, context: SkillExecutionContext) {
    if (!context.integrationId) throw new Error('Integration ID is required for Google Calendar operations');
    const calendar = await createGoogleCalendarClient(context.integrationId);
    const res = await calendar.calendarList.list();
    return (res.data.items || []).map((cal) => ({
      id: cal.id,
      summary: cal.summary,
      description: cal.description,
      primary: cal.primary,
      accessRole: cal.accessRole,
      timeZone: cal.timeZone,
    }));
  },

  // List events in a calendar, optionally filtered by time range
  async google_calendar_list_events(params: any, context: SkillExecutionContext) {
    if (!context.integrationId) throw new Error('Integration ID is required for Google Calendar operations');
    const { calendarId, timeMin, timeMax, maxResults = 20, q } = params;
    if (!calendarId) throw new Error('calendarId is required');
    const calendar = await createGoogleCalendarClient(context.integrationId);
    const res = await calendar.events.list({
      calendarId,
      timeMin,
      timeMax,
      maxResults,
      q,
      singleEvents: true,
      orderBy: 'startTime',
    });
    return (res.data.items || []).map((event) => ({
      id: event.id,
      summary: event.summary,
      description: event.description,
      start: event.start,
      end: event.end,
      status: event.status,
      attendees: event.attendees,
      organizer: event.organizer,
      location: event.location,
      hangoutLink: event.hangoutLink,
      htmlLink: event.htmlLink,
    }));
  },

  // Get details for a specific calendar event
  async google_calendar_get_event(params: any, context: SkillExecutionContext) {
    if (!context.integrationId) throw new Error('Integration ID is required for Google Calendar operations');
    const { calendarId, eventId } = params;
    if (!calendarId) throw new Error('calendarId is required');
    if (!eventId) throw new Error('eventId is required');
    const calendar = await createGoogleCalendarClient(context.integrationId);
    const res = await calendar.events.get({ calendarId, eventId });
    const event = res.data;
    return {
      id: event.id,
      summary: event.summary,
      description: event.description,
      start: event.start,
      end: event.end,
      status: event.status,
      attendees: event.attendees,
      organizer: event.organizer,
      location: event.location,
      hangoutLink: event.hangoutLink,
      htmlLink: event.htmlLink,
      recurrence: event.recurrence,
      reminders: event.reminders,
      created: event.created,
      updated: event.updated,
    };
  },

  // Create a new event in a calendar
  async google_calendar_create_event(params: any, context: SkillExecutionContext) {
    if (!context.integrationId) throw new Error('Integration ID is required for Google Calendar operations');
    const { calendarId, event } = params;
    if (!calendarId) throw new Error('calendarId is required');
    if (!event) throw new Error('event object is required');
    const calendar = await createGoogleCalendarClient(context.integrationId);
    const res = await calendar.events.insert({ calendarId, requestBody: event });
    return {
      id: res.data.id,
      summary: res.data.summary,
      status: res.data.status,
      htmlLink: res.data.htmlLink,
      start: res.data.start,
      end: res.data.end,
    };
  },

  // Update an existing calendar event
  async google_calendar_update_event(params: any, context: SkillExecutionContext) {
    if (!context.integrationId) throw new Error('Integration ID is required for Google Calendar operations');
    const { calendarId, eventId, event } = params;
    if (!calendarId) throw new Error('calendarId is required');
    if (!eventId) throw new Error('eventId is required');
    if (!event) throw new Error('event object is required');
    const calendar = await createGoogleCalendarClient(context.integrationId);
    const res = await calendar.events.update({ calendarId, eventId, requestBody: event });
    return {
      id: res.data.id,
      summary: res.data.summary,
      status: res.data.status,
      htmlLink: res.data.htmlLink,
      start: res.data.start,
      end: res.data.end,
    };
  },

  // Delete an event from a calendar
  async google_calendar_delete_event(params: any, context: SkillExecutionContext) {
    if (!context.integrationId) throw new Error('Integration ID is required for Google Calendar operations');
    const { calendarId, eventId } = params;
    if (!calendarId) throw new Error('calendarId is required');
    if (!eventId) throw new Error('eventId is required');
    const calendar = await createGoogleCalendarClient(context.integrationId);
    await calendar.events.delete({ calendarId, eventId });
    return { success: true };
  },

  // RSVP or respond to a calendar event invitation
  async google_calendar_rsvp_event(params: any, context: SkillExecutionContext) {
    if (!context.integrationId) throw new Error('Integration ID is required for Google Calendar operations');
    const { calendarId, eventId, responseStatus, attendeeEmail } = params;
    if (!calendarId) throw new Error('calendarId is required');
    if (!eventId) throw new Error('eventId is required');
    if (!responseStatus) throw new Error('responseStatus is required (accepted, declined, tentative)');
    if (!attendeeEmail) throw new Error('attendeeEmail is required');
    const calendar = await createGoogleCalendarClient(context.integrationId);
    // Fetch the event
    const res = await calendar.events.get({ calendarId, eventId });
    const event = res.data;
    if (!event.attendees) throw new Error('No attendees found for this event');
    // Update the attendee's response
    const updatedAttendees = event.attendees.map((att) =>
      att.email === attendeeEmail ? { ...att, responseStatus } : att
    );
    const updateRes = await calendar.events.patch({
      calendarId,
      eventId,
      requestBody: { attendees: updatedAttendees },
    });
    return {
      id: updateRes.data.id,
      summary: updateRes.data.summary,
      status: updateRes.data.status,
      attendees: updateRes.data.attendees,
    };
  },

  // Search for events in a calendar by keyword, attendee, etc.
  async google_calendar_search_events(params: any, context: SkillExecutionContext) {
    if (!context.integrationId) throw new Error('Integration ID is required for Google Calendar operations');
    const { calendarId, q, timeMin, timeMax, maxResults = 20 } = params;
    if (!calendarId) throw new Error('calendarId is required');
    if (!q) throw new Error('Search query (q) is required');
    const calendar = await createGoogleCalendarClient(context.integrationId);
    const res = await calendar.events.list({
      calendarId,
      q,
      timeMin,
      timeMax,
      maxResults,
      singleEvents: true,
      orderBy: 'startTime',
    });
    return (res.data.items || []).map((event) => ({
      id: event.id,
      summary: event.summary,
      description: event.description,
      start: event.start,
      end: event.end,
      status: event.status,
      attendees: event.attendees,
      organizer: event.organizer,
      location: event.location,
      hangoutLink: event.hangoutLink,
      htmlLink: event.htmlLink,
    }));
  },
}; 