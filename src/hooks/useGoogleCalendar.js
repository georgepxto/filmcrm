import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPES = 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
const LS_TOKEN_KEY = 'takeone_gcal_token';
const LS_EXPIRY_KEY = 'takeone_gcal_expiry';
const REFRESH_MARGIN_MS = 5 * 60 * 1000; // Refresh 5 min before expiry

/**
 * Hook for Google Calendar integration.
 * Stores the access token in localStorage to survive page reloads.
 * Uses a background refresh timer so the user is never disconnected mid-session.
 * Filters out CRM-created events to avoid duplication.
 */
export function useGoogleCalendar() {
  const { user } = useAuth(); // Wait for Supabase auth to be ready
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [gapiReady, setGapiReady] = useState(false);
  const [gisReady, setGisReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState([]);
  const tokenClientRef = useRef(null);
  const accessTokenRef = useRef(null);
  const restoredRef = useRef(false);
  const refreshTimerRef = useRef(null);

  // Schedule a silent background refresh before the token expires
  const scheduleRefresh = useCallback((expiresInSec) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    const delay = Math.max(0, expiresInSec * 1000 - REFRESH_MARGIN_MS);
    refreshTimerRef.current = setTimeout(async () => {
      const { data } = await supabase.functions.invoke('google-calendar', {
        body: { action: 'get_token' }
      });
      if (data?.access_token) {
        applyToken(data.access_token, data.expires_in);
      } else {
        clearAuth();
      }
    }, delay);
  }, []);

  // Apply token to GAPI and persist
  const applyToken = useCallback((token, expiresInSec) => {
    accessTokenRef.current = token;
    window.gapi.client.setToken({ access_token: token });
    setIsSignedIn(true);

    // Store token and when it expires
    localStorage.setItem(LS_TOKEN_KEY, token);
    if (expiresInSec) {
      const expiryMs = Date.now() + expiresInSec * 1000;
      localStorage.setItem(LS_EXPIRY_KEY, String(expiryMs));
      scheduleRefresh(expiresInSec);
    }
  }, [scheduleRefresh]);

  const clearAuth = useCallback(() => {
    accessTokenRef.current = null;
    localStorage.removeItem(LS_TOKEN_KEY);
    localStorage.removeItem(LS_EXPIRY_KEY);
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    setIsSignedIn(false);
    setEvents([]);
    try { window.gapi?.client?.setToken(null); } catch (_) {}
  }, []);

  // Initialize GAPI client
  useEffect(() => {
    if (!CLIENT_ID) return;
    const initGapi = () => {
      window.gapi.load('client', async () => {
        await window.gapi.client.init({});
        await window.gapi.client.load(DISCOVERY_DOC);
        setGapiReady(true);
      });
    };
    if (window.gapi) {
      initGapi();
    } else {
      const interval = setInterval(() => {
        if (window.gapi) { clearInterval(interval); initGapi(); }
      }, 200);
      return () => clearInterval(interval);
    }
  }, []);

  // Initialize Google Identity Services
  useEffect(() => {
    if (!CLIENT_ID) return;
    const initGis = () => {
      tokenClientRef.current = window.google.accounts.oauth2.initCodeClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        access_type: 'offline',
        prompt: 'consent',           // Always force consent so Google always returns refresh_token
        callback: async (response) => {
          if (response.error) {
            console.error('Google OAuth error:', response);
            clearAuth();
            return;
          }
          const { data, error } = await supabase.functions.invoke('google-calendar', {
            body: { action: 'exchange_code', code: response.code }
          });
          if (error || !data?.access_token) {
            console.error('Failed to exchange code:', error || data?.error);
            clearAuth();
            return;
          }
          applyToken(data.access_token, data.expires_in);
        },
      });
      setGisReady(true);
    };
    if (window.google?.accounts?.oauth2) {
      initGis();
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.oauth2) { clearInterval(interval); initGis(); }
      }, 200);
      return () => clearInterval(interval);
    }
  }, [applyToken, clearAuth]);

  // Restore saved token on page load or fetch from backend
  // Depends on BOTH gapiReady AND user being authenticated — avoids race condition
  useEffect(() => {
    if (!gapiReady || !user || restoredRef.current) return;
    restoredRef.current = true;

    const attemptRestore = async () => {
      const savedToken = localStorage.getItem(LS_TOKEN_KEY);
      const savedExpiry = localStorage.getItem(LS_EXPIRY_KEY);
      const timeLeft = savedExpiry ? Number(savedExpiry) - Date.now() : 0;

      // If token is still valid for more than 1 min, use it and schedule refresh
      if (savedToken && timeLeft > 60000) {
        accessTokenRef.current = savedToken;
        window.gapi.client.setToken({ access_token: savedToken });
        setIsSignedIn(true);
        // Schedule refresh based on remaining time
        scheduleRefresh(Math.floor(timeLeft / 1000));
        return;
      }

      // Token expired or missing — ask backend for a fresh one using refresh_token
      // The supabase client automatically sends the user's JWT in the Authorization header
      const { data, error } = await supabase.functions.invoke('google-calendar', {
        body: { action: 'get_token' }
      });

      if (error || !data?.access_token) {
        // No refresh token on server either — user must reconnect manually
        clearAuth();
        return;
      }
      
      applyToken(data.access_token, data.expires_in);
    };

    attemptRestore();
  }, [gapiReady, user, clearAuth, applyToken, scheduleRefresh]);

  // Reset restoredRef if user changes (e.g. sign out + sign in as different account)
  useEffect(() => {
    if (!user) {
      restoredRef.current = false;
      clearAuth();
    }
  }, [user, clearAuth]);

  const ready = gapiReady && gisReady && !!CLIENT_ID;

  // Manual sign in — always request fresh consent to guarantee refresh_token
  const signIn = useCallback(() => {
    if (!tokenClientRef.current) return;
    tokenClientRef.current.requestCode();
  }, []);

  // Sign out: revoke access token AND delete refresh_token from DB
  const signOut = useCallback(async () => {
    if (accessTokenRef.current) {
      try { window.google.accounts.oauth2.revoke(accessTokenRef.current, () => {}); } catch (_) {}
    }
    // Remove the refresh_token from DB so next connect always gets a fresh one
    try {
      await supabase.functions.invoke('google-calendar', { body: { action: 'revoke' } });
    } catch (_) {}
    clearAuth();
  }, [clearAuth]);

  // Fetch events — filters out CRM-created events to prevent duplication
  const fetchEvents = useCallback(async (timeMin, timeMax) => {
    if (!isSignedIn) return [];
    setLoading(true);
    try {
      const response = await window.gapi.client.calendar.events.list({
        calendarId: 'primary',
        timeMin: new Date(timeMin).toISOString(),
        timeMax: new Date(timeMax).toISOString(),
        showDeleted: false,
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 250,
      });
      const items = (response.result.items || []).filter(ev => {
        // Skip events created by TakeOne to avoid duplicates
        const desc = (ev.description || '').toLowerCase();
        const summary = ev.summary || '';
        if (desc.includes('filmmakercrm')) return false;
        if (summary.startsWith('📹') || summary.startsWith('📅')) return false;
        return true;
      });
      setEvents(items);
      setLoading(false);
      return items;
    } catch (err) {
      if (err?.status === 401 || err?.result?.error?.code === 401) {
        supabase.functions.invoke('google-calendar', {
          body: { action: 'get_token' }
        }).then(({ data }) => {
          if (data?.access_token) {
            applyToken(data.access_token, data.expires_in);
          } else {
            clearAuth();
          }
        });
      }
      console.error('Error fetching Google Calendar events:', err);
      setLoading(false);
      return [];
    }
  }, [isSignedIn, clearAuth]);

  // Create a new event on Google Calendar
  const createEvent = useCallback(async ({ summary, description, date, timeStart, timeEnd, location }) => {
    if (!isSignedIn) return null;
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const event = {
        summary,
        description: description || '',
        location: location || '',
        start: { dateTime: `${date}T${timeStart || '09:00'}:00`, timeZone: tz },
        end:   { dateTime: `${date}T${timeEnd   || '10:00'}:00`, timeZone: tz },
        colorId: '6',
      };
      const response = await window.gapi.client.calendar.events.insert({
        calendarId: 'primary',
        resource: event,
      });
      return response.result;
    } catch (err) {
      console.error('Error creating Google Calendar event:', err);
      return null;
    }
  }, [isSignedIn]);

  // Update an existing event on Google Calendar
  const updateEvent = useCallback(async (eventId, { summary, description, date, timeStart, timeEnd, location }) => {
    if (!isSignedIn || !eventId) return null;
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const event = {
        summary,
        description: description || '',
        location: location || '',
        start: { dateTime: `${date}T${timeStart || '09:00'}:00`, timeZone: tz },
        end:   { dateTime: `${date}T${timeEnd   || '10:00'}:00`, timeZone: tz },
        colorId: '6',
      };
      const response = await window.gapi.client.calendar.events.update({
        calendarId: 'primary',
        eventId,
        resource: event,
      });
      return response.result;
    } catch (err) {
      console.error('Error updating Google Calendar event:', err);
      return null;
    }
  }, [isSignedIn]);

  // Delete an event from Google Calendar
  const deleteEvent = useCallback(async (eventId) => {
    if (!isSignedIn || !eventId) return false;
    try {
      await window.gapi.client.calendar.events.delete({ calendarId: 'primary', eventId });
      return true;
    } catch (err) {
      console.error('Error deleting Google Calendar event:', err);
      return false;
    }
  }, [isSignedIn]);

  return { ready, isSignedIn, loading, events, signIn, signOut, fetchEvents, createEvent, updateEvent, deleteEvent };
}
