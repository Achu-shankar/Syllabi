"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GOOGLE_CALENDAR_SKILL_IMPLEMENTATIONS = exports.GOOGLE_CALENDAR_SKILL_DEFINITIONS = void 0;
var google_auth_service_1 = require("../google_auth_service");
exports.GOOGLE_CALENDAR_SKILL_DEFINITIONS = [
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
exports.GOOGLE_CALENDAR_SKILL_IMPLEMENTATIONS = {
    // List all calendars accessible by the user
    google_calendar_list_calendars: function (params, context) {
        return __awaiter(this, void 0, void 0, function () {
            var calendar, res;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!context.integrationId)
                            throw new Error('Integration ID is required for Google Calendar operations');
                        return [4 /*yield*/, (0, google_auth_service_1.createGoogleCalendarClient)(context.integrationId)];
                    case 1:
                        calendar = _a.sent();
                        return [4 /*yield*/, calendar.calendarList.list()];
                    case 2:
                        res = _a.sent();
                        return [2 /*return*/, (res.data.items || []).map(function (cal) { return ({
                                id: cal.id,
                                summary: cal.summary,
                                description: cal.description,
                                primary: cal.primary,
                                accessRole: cal.accessRole,
                                timeZone: cal.timeZone,
                            }); })];
                }
            });
        });
    },
    // List events in a calendar, optionally filtered by time range
    google_calendar_list_events: function (params, context) {
        return __awaiter(this, void 0, void 0, function () {
            var calendarId, timeMin, timeMax, _a, maxResults, q, calendar, res;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!context.integrationId)
                            throw new Error('Integration ID is required for Google Calendar operations');
                        calendarId = params.calendarId, timeMin = params.timeMin, timeMax = params.timeMax, _a = params.maxResults, maxResults = _a === void 0 ? 20 : _a, q = params.q;
                        if (!calendarId)
                            throw new Error('calendarId is required');
                        return [4 /*yield*/, (0, google_auth_service_1.createGoogleCalendarClient)(context.integrationId)];
                    case 1:
                        calendar = _b.sent();
                        return [4 /*yield*/, calendar.events.list({
                                calendarId: calendarId,
                                timeMin: timeMin,
                                timeMax: timeMax,
                                maxResults: maxResults,
                                q: q,
                                singleEvents: true,
                                orderBy: 'startTime',
                            })];
                    case 2:
                        res = _b.sent();
                        return [2 /*return*/, (res.data.items || []).map(function (event) { return ({
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
                            }); })];
                }
            });
        });
    },
    // Get details for a specific calendar event
    google_calendar_get_event: function (params, context) {
        return __awaiter(this, void 0, void 0, function () {
            var calendarId, eventId, calendar, res, event;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!context.integrationId)
                            throw new Error('Integration ID is required for Google Calendar operations');
                        calendarId = params.calendarId, eventId = params.eventId;
                        if (!calendarId)
                            throw new Error('calendarId is required');
                        if (!eventId)
                            throw new Error('eventId is required');
                        return [4 /*yield*/, (0, google_auth_service_1.createGoogleCalendarClient)(context.integrationId)];
                    case 1:
                        calendar = _a.sent();
                        return [4 /*yield*/, calendar.events.get({ calendarId: calendarId, eventId: eventId })];
                    case 2:
                        res = _a.sent();
                        event = res.data;
                        return [2 /*return*/, {
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
                            }];
                }
            });
        });
    },
    // Create a new event in a calendar
    google_calendar_create_event: function (params, context) {
        return __awaiter(this, void 0, void 0, function () {
            var calendarId, event, calendar, res;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!context.integrationId)
                            throw new Error('Integration ID is required for Google Calendar operations');
                        calendarId = params.calendarId, event = params.event;
                        if (!calendarId)
                            throw new Error('calendarId is required');
                        if (!event)
                            throw new Error('event object is required');
                        return [4 /*yield*/, (0, google_auth_service_1.createGoogleCalendarClient)(context.integrationId)];
                    case 1:
                        calendar = _a.sent();
                        return [4 /*yield*/, calendar.events.insert({ calendarId: calendarId, requestBody: event })];
                    case 2:
                        res = _a.sent();
                        return [2 /*return*/, {
                                id: res.data.id,
                                summary: res.data.summary,
                                status: res.data.status,
                                htmlLink: res.data.htmlLink,
                                start: res.data.start,
                                end: res.data.end,
                            }];
                }
            });
        });
    },
    // Update an existing calendar event
    google_calendar_update_event: function (params, context) {
        return __awaiter(this, void 0, void 0, function () {
            var calendarId, eventId, event, calendar, res;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!context.integrationId)
                            throw new Error('Integration ID is required for Google Calendar operations');
                        calendarId = params.calendarId, eventId = params.eventId, event = params.event;
                        if (!calendarId)
                            throw new Error('calendarId is required');
                        if (!eventId)
                            throw new Error('eventId is required');
                        if (!event)
                            throw new Error('event object is required');
                        return [4 /*yield*/, (0, google_auth_service_1.createGoogleCalendarClient)(context.integrationId)];
                    case 1:
                        calendar = _a.sent();
                        return [4 /*yield*/, calendar.events.update({ calendarId: calendarId, eventId: eventId, requestBody: event })];
                    case 2:
                        res = _a.sent();
                        return [2 /*return*/, {
                                id: res.data.id,
                                summary: res.data.summary,
                                status: res.data.status,
                                htmlLink: res.data.htmlLink,
                                start: res.data.start,
                                end: res.data.end,
                            }];
                }
            });
        });
    },
    // Delete an event from a calendar
    google_calendar_delete_event: function (params, context) {
        return __awaiter(this, void 0, void 0, function () {
            var calendarId, eventId, calendar;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!context.integrationId)
                            throw new Error('Integration ID is required for Google Calendar operations');
                        calendarId = params.calendarId, eventId = params.eventId;
                        if (!calendarId)
                            throw new Error('calendarId is required');
                        if (!eventId)
                            throw new Error('eventId is required');
                        return [4 /*yield*/, (0, google_auth_service_1.createGoogleCalendarClient)(context.integrationId)];
                    case 1:
                        calendar = _a.sent();
                        return [4 /*yield*/, calendar.events.delete({ calendarId: calendarId, eventId: eventId })];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, { success: true }];
                }
            });
        });
    },
    // RSVP or respond to a calendar event invitation
    google_calendar_rsvp_event: function (params, context) {
        return __awaiter(this, void 0, void 0, function () {
            var calendarId, eventId, responseStatus, attendeeEmail, calendar, res, event, updatedAttendees, updateRes;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!context.integrationId)
                            throw new Error('Integration ID is required for Google Calendar operations');
                        calendarId = params.calendarId, eventId = params.eventId, responseStatus = params.responseStatus, attendeeEmail = params.attendeeEmail;
                        if (!calendarId)
                            throw new Error('calendarId is required');
                        if (!eventId)
                            throw new Error('eventId is required');
                        if (!responseStatus)
                            throw new Error('responseStatus is required (accepted, declined, tentative)');
                        if (!attendeeEmail)
                            throw new Error('attendeeEmail is required');
                        return [4 /*yield*/, (0, google_auth_service_1.createGoogleCalendarClient)(context.integrationId)];
                    case 1:
                        calendar = _a.sent();
                        return [4 /*yield*/, calendar.events.get({ calendarId: calendarId, eventId: eventId })];
                    case 2:
                        res = _a.sent();
                        event = res.data;
                        if (!event.attendees)
                            throw new Error('No attendees found for this event');
                        updatedAttendees = event.attendees.map(function (att) {
                            return att.email === attendeeEmail ? __assign(__assign({}, att), { responseStatus: responseStatus }) : att;
                        });
                        return [4 /*yield*/, calendar.events.patch({
                                calendarId: calendarId,
                                eventId: eventId,
                                requestBody: { attendees: updatedAttendees },
                            })];
                    case 3:
                        updateRes = _a.sent();
                        return [2 /*return*/, {
                                id: updateRes.data.id,
                                summary: updateRes.data.summary,
                                status: updateRes.data.status,
                                attendees: updateRes.data.attendees,
                            }];
                }
            });
        });
    },
    // Search for events in a calendar by keyword, attendee, etc.
    google_calendar_search_events: function (params, context) {
        return __awaiter(this, void 0, void 0, function () {
            var calendarId, q, timeMin, timeMax, _a, maxResults, calendar, res;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!context.integrationId)
                            throw new Error('Integration ID is required for Google Calendar operations');
                        calendarId = params.calendarId, q = params.q, timeMin = params.timeMin, timeMax = params.timeMax, _a = params.maxResults, maxResults = _a === void 0 ? 20 : _a;
                        if (!calendarId)
                            throw new Error('calendarId is required');
                        if (!q)
                            throw new Error('Search query (q) is required');
                        return [4 /*yield*/, (0, google_auth_service_1.createGoogleCalendarClient)(context.integrationId)];
                    case 1:
                        calendar = _b.sent();
                        return [4 /*yield*/, calendar.events.list({
                                calendarId: calendarId,
                                q: q,
                                timeMin: timeMin,
                                timeMax: timeMax,
                                maxResults: maxResults,
                                singleEvents: true,
                                orderBy: 'startTime',
                            })];
                    case 2:
                        res = _b.sent();
                        return [2 /*return*/, (res.data.items || []).map(function (event) { return ({
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
                            }); })];
                }
            });
        });
    },
};
