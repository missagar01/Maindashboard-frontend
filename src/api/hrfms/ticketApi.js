import { apiRequest } from './apiRequest';

export const createTicket = (payload, token) =>
  apiRequest('/api/hrfms/tickets', {
    method: 'POST',
    body: payload,
    token,
  });

export const getTickets = (token) =>
  apiRequest('/api/hrfms/tickets', {
    method: 'GET',
    token,
  });
