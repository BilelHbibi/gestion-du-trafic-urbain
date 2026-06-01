require('dotenv').config();
const express    = require('express');
const http       = require('http');
const { ApolloServer }       = require('@apollo/server');
const { expressMiddleware }  = require('@apollo/server/express4');
const { Server: SocketIO }   = require('socket.io');
const axios = require('axios');

const AUTH     = process.env.AUTH_URL     || 'http://localhost:3001';
const VEHICLE  = process.env.VEHICLE_URL  || 'http://localhost:3002';
const TRAFFIC  = process.env.TRAFFIC_URL  || 'http://localhost:3003';
const INCIDENT = process.env.INCIDENT_URL || 'http://localhost:3004';
const NOTIF    = process.env.NOTIF_URL    || 'http://localhost:3005';

// ═══════════════════════════════════════════════════════════
//  SCHÉMA GRAPHQL
// ═══════════════════════════════════════════════════════════
const typeDefs = `#graphql

  # ── Types Auth ──────────────────────────────────────────
  type User {
    id: Int
    name: String
    email: String
    role: String
    created_at: String
  }

  type AuthResponse {
    token: String
    user: User
  }

  # ── Types Véhicules ──────────────────────────────────────
  type Vehicle {
    id: Int
    plate: String
    type: String
    owner: String
    created_at: String
  }


  type GpsPosition {
    id: Int
    vehicle_id: Int
    latitude: Float
    longitude: Float
    speed: Float
    recorded_at: String
  }

  # ── Types Trafic ─────────────────────────────────────────
  type Zone {
    id: Int
    name: String
    lat_min: Float
    lat_max: Float
    lng_min: Float
    lng_max: Float
  }

  type ZoneSummary {
    id: Int
    name: String
    lat_min: Float
    lat_max: Float
    lng_min: Float
    lng_max: Float
    density: Int
    level: String
    measured_at: String
  }

  type TrafficMeasure {
    id: Int
    zone_id: Int
    density: Int
    level: String
    measured_at: String
  }

  type CongestedZone {
    zone_id: Int
    name: String
    density: Int
    level: String
    measured_at: String
  }

  # ── Types Incidents ──────────────────────────────────────
  type Incident {
    id: Int
    type: String
    description: String
    latitude: Float
    longitude: Float
    status: String
    reported_by: Int
    created_at: String
  }

  type IncidentCount {
    type: String
    status: String
    count: Int
  }

  type IncidentStats {
    total: Int
    today: Int
    by_type: [IncidentCount]
    by_status: [IncidentCount]
  }

  # ── Types Notifications ───────────────────────────────────
  type Notification {
    id: Int
    user_id: Int
    message: String
    is_read: Boolean
    created_at: String
  }

  type NotificationCount {
    total: Int
    unread: Int
  }

  # ── Types Généraux ────────────────────────────────────────
  type Message {
    message: String
  }

  type ServiceHealth {
    service: String
    status: String
    timestamp: String
  }

  type PlatformStats {
    total_users: Int
    total_vehicles: Int
    total_zones: Int
    total_incidents: Int
    total_notifications: Int
    congested_zones: Int
  }

  type TrafficStats {
    total_zones: Int
    total_measures: Int
    congested: Int
  }

  type VehicleStats {
    total_vehicles: Int
    total_positions: Int
    active_today: Int
  }

  # ── Queries ───────────────────────────────────────────────
  type Query {
    # Auth
    me: User
    getUsers: [User]

    # Véhicules
    getVehicles: [Vehicle]
    getVehicle(id: Int!): Vehicle
    getVehicleHistory(id: Int!, limit: Int): [GpsPosition]
    getLastPosition(id: Int!): GpsPosition
    getVehicleStats: VehicleStats

    # Trafic
    getZones: [Zone]
    getZoneSummary: [ZoneSummary]
    getCongestedZones: [CongestedZone]
    getZoneMeasures(zone_id: Int!, limit: Int): [TrafficMeasure]
    getTrafficStats: TrafficStats

    # Incidents
    getIncidents(type: String, status: String): [Incident]
    getIncident(id: Int!): Incident
    getIncidentStats: IncidentStats

    # Notifications
    getNotifications: [Notification]
    getUnreadNotifications: [Notification]
    getNotificationCount: NotificationCount

    # Plateforme
    healthCheck: [ServiceHealth]
    getPlatformStats: PlatformStats
  }

  # ── Mutations ─────────────────────────────────────────────
  type Mutation {
    # Auth
    register(name: String!, email: String!, password: String!, role: String): Message
    login(email: String!, password: String!): AuthResponse
    deleteUser(id: Int!): Message

    # Véhicules
    addVehicle(plate: String!, type: String!, owner: String!): Message
    updateVehicle(id: Int!, plate: String, type: String, owner: String): Message
    deleteVehicle(id: Int!): Message
    addGpsPosition(vehicle_id: Int!, latitude: Float!, longitude: Float!, speed: Float): Message

    # Trafic
    createZone(name: String!, lat_min: Float!, lat_max: Float!, lng_min: Float!, lng_max: Float!): Message
    deleteZone(id: Int!): Message
    addTrafficMeasure(zone_id: Int!, density: Int!): Message

    # Incidents
    reportIncident(type: String!, description: String, latitude: Float, longitude: Float): Message
    updateIncidentStatus(id: Int!, status: String!): Message
    deleteIncident(id: Int!): Message

    # Notifications
    markNotificationRead(id: Int!): Message
    markAllNotificationsRead: Message
    deleteNotification(id: Int!): Message
  }
`;

// ═══════════════════════════════════════════════════════════
//  RESOLVERS
// ═══════════════════════════════════════════════════════════
function auth(token) {
  return token ? { headers: { authorization: `Bearer ${token}` } } : {};
}

function buildResolvers(io) {
  return {
    Query: {
      // ── Auth ────────────────────────────────────────────
      me: async (_, __, { token }) =>
        (await axios.get(`${AUTH}/me`, auth(token))).data,

      getUsers: async (_, __, { token }) =>
        (await axios.get(`${AUTH}/users`, auth(token))).data,

      // ── Véhicules ───────────────────────────────────────
      getVehicles: async (_, __, { token }) => {
        const { data } = await axios.get(`${VEHICLE}/vehicles`, auth(token));
        return data.data;
      },

      getVehicle: async (_, { id }, { token }) =>
        (await axios.get(`${VEHICLE}/vehicles/${id}`, auth(token))).data,

      getVehicleHistory: async (_, { id, limit = 50 }, { token }) =>
        (await axios.get(`${VEHICLE}/vehicles/${id}/history?limit=${limit}`, auth(token))).data,

      getLastPosition: async (_, { id }, { token }) =>
        (await axios.get(`${VEHICLE}/vehicles/${id}/last-position`, auth(token))).data,

      getVehicleStats: async (_, __, { token }) =>
        (await axios.get(`${VEHICLE}/stats`, auth(token))).data,

      // ── Trafic ──────────────────────────────────────────
      getZones: async (_, __, { token }) =>
        (await axios.get(`${TRAFFIC}/zones`, auth(token))).data,

      getZoneSummary: async (_, __, { token }) =>
        (await axios.get(`${TRAFFIC}/zones/summary`, auth(token))).data,

      getCongestedZones: async (_, __, { token }) =>
        (await axios.get(`${TRAFFIC}/zones/congested`, auth(token))).data,

      getZoneMeasures: async (_, { zone_id, limit = 30 }, { token }) =>
        (await axios.get(`${TRAFFIC}/zones/${zone_id}/measures?limit=${limit}`, auth(token))).data,

      getTrafficStats: async (_, __, { token }) =>
        (await axios.get(`${TRAFFIC}/stats`, auth(token))).data,

      // ── Incidents ───────────────────────────────────────
      getIncidents: async (_, { type, status }, { token }) => {
        const params = new URLSearchParams();
        if (type)   params.append('type', type);
        if (status) params.append('status', status);
        return (await axios.get(`${INCIDENT}/incidents?${params}`, auth(token))).data;
      },

      getIncident: async (_, { id }, { token }) =>
        (await axios.get(`${INCIDENT}/incidents/${id}`, auth(token))).data,

      getIncidentStats: async (_, __, { token }) =>
        (await axios.get(`${INCIDENT}/incidents/stats`, auth(token))).data,

      // ── Notifications ────────────────────────────────────
      getNotifications: async (_, __, { token }) =>
        (await axios.get(`${NOTIF}/notifications`, auth(token))).data,

      getUnreadNotifications: async (_, __, { token }) =>
        (await axios.get(`${NOTIF}/notifications/unread`, auth(token))).data,

      getNotificationCount: async (_, __, { token }) =>
        (await axios.get(`${NOTIF}/notifications/count`, auth(token))).data,

      // ── Plateforme ──────────────────────────────────────
      healthCheck: async () => {
        const services = [
          { name: 'auth',         url: `${AUTH}/health` },
          { name: 'vehicle',      url: `${VEHICLE}/health` },
          { name: 'traffic',      url: `${TRAFFIC}/health` },
          { name: 'incident',     url: `${INCIDENT}/health` },
          { name: 'notification', url: `${NOTIF}/health` },
        ];
        const results = await Promise.allSettled(
          services.map(s => axios.get(s.url, { timeout: 3000 }))
        );
        return services.map((s, i) => ({
          service:   s.name,
          status:    results[i].status === 'fulfilled' ? 'OK' : 'DOWN',
          timestamp: results[i].status === 'fulfilled'
            ? results[i].value.data.timestamp
            : new Date().toISOString(),
        }));
      },

      getPlatformStats: async (_, __, { token }) => {
        const [users, vehicleStats, trafficStats, incidentStats, notifCount] =
          await Promise.allSettled([
            axios.get(`${AUTH}/users`,              auth(token)),
            axios.get(`${VEHICLE}/stats`,           auth(token)),
            axios.get(`${TRAFFIC}/stats`,           auth(token)),
            axios.get(`${INCIDENT}/incidents/stats`, auth(token)),
            axios.get(`${NOTIF}/notifications/count`, auth(token)),
          ]);

        return {
          total_users:         users.status === 'fulfilled'         ? (Array.isArray(users.value.data) ? users.value.data.length : 0) : 0,
          total_vehicles:      vehicleStats.status === 'fulfilled'  ? vehicleStats.value.data.total_vehicles : 0,
          total_zones:         trafficStats.status === 'fulfilled'  ? trafficStats.value.data.total_zones : 0,
          total_incidents:     incidentStats.status === 'fulfilled' ? incidentStats.value.data.total     : 0,
          total_notifications: notifCount.status === 'fulfilled'    ? notifCount.value.data.total        : 0,
          congested_zones:     trafficStats.status === 'fulfilled'  ? trafficStats.value.data.congested  : 0,
        };
      },
    },

    Mutation: {
      // ── Auth ────────────────────────────────────────────
      register: async (_, args) =>
        (await axios.post(`${AUTH}/register`, args)).data,

      login: async (_, args) =>
        (await axios.post(`${AUTH}/login`, args)).data,

      deleteUser: async (_, { id }, { token }) =>
        (await axios.delete(`${AUTH}/users/${id}`, auth(token))).data,

      // ── Véhicules ───────────────────────────────────────
      addVehicle: async (_, args, { token }) =>
        (await axios.post(`${VEHICLE}/vehicles`, args, auth(token))).data,

      updateVehicle: async (_, { id, ...args }, { token }) =>
        (await axios.put(`${VEHICLE}/vehicles/${id}`, args, auth(token))).data,

      deleteVehicle: async (_, { id }, { token }) =>
        (await axios.delete(`${VEHICLE}/vehicles/${id}`, auth(token))).data,

      addGpsPosition: async (_, { vehicle_id, ...args }, { token }) =>
        (await axios.post(`${VEHICLE}/vehicles/${vehicle_id}/position`, args, auth(token))).data,

      // ── Trafic ──────────────────────────────────────────
      createZone: async (_, args, { token }) =>
        (await axios.post(`${TRAFFIC}/zones`, args, auth(token))).data,

      deleteZone: async (_, { id }, { token }) =>
        (await axios.delete(`${TRAFFIC}/zones/${id}`, auth(token))).data,

      addTrafficMeasure: async (_, { zone_id, density }, { token }) => {
        const result = (await axios.post(`${TRAFFIC}/zones/${zone_id}/measure`, { density }, auth(token))).data;
        // Émettre un événement WebSocket si zone congestionnée
        if (result.level === 'Eleve') {
          io.emit('traffic_alert', {
            zone_id,
            density,
            level: result.level,
            zone: result.zone,
            timestamp: new Date().toISOString(),
          });
        }
        return result;
      },

      // ── Incidents ───────────────────────────────────────
      reportIncident: async (_, args, { token }) => {
        const result = (await axios.post(`${INCIDENT}/incidents`, args, auth(token))).data;
        // Émettre un événement WebSocket temps réel
        io.emit('new_incident', {
          id:          result.id,
          type:        args.type,
          description: args.description || '',
          latitude:    args.latitude    || null,
          longitude:   args.longitude   || null,
          status:      'Signale',
          timestamp:   new Date().toISOString(),
        });
        return result;
      },

      updateIncidentStatus: async (_, { id, status }, { token }) => {
        const result = (await axios.patch(`${INCIDENT}/incidents/${id}/status`, { status }, auth(token))).data;
        // Notifier via WebSocket
        io.emit('incident_updated', { id, status, timestamp: new Date().toISOString() });
        return result;
      },

      deleteIncident: async (_, { id }, { token }) =>
        (await axios.delete(`${INCIDENT}/incidents/${id}`, auth(token))).data,

      // ── Notifications ────────────────────────────────────
      markNotificationRead: async (_, { id }, { token }) =>
        (await axios.patch(`${NOTIF}/notifications/${id}/read`, {}, auth(token))).data,

      markAllNotificationsRead: async (_, __, { token }) =>
        (await axios.patch(`${NOTIF}/notifications/read-all`, {}, auth(token))).data,

      deleteNotification: async (_, { id }, { token }) =>
        (await axios.delete(`${NOTIF}/notifications/${id}`, auth(token))).data,
    },
  };
}

// ═══════════════════════════════════════════════════════════
//  DÉMARRAGE
// ═══════════════════════════════════════════════════════════
async function startServer() {
  const app        = express();
  const httpServer = http.createServer(app);

  // ── WebSocket ────────────────────────────────────────────
  const io = new SocketIO(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  io.on('connection', socket => {
    console.log(`[WS] Client connecté : ${socket.id}`);
    socket.emit('welcome', {
      message: 'Connecté à Traffic Platform WebSocket',
      timestamp: new Date().toISOString(),
    });
    socket.on('disconnect', () =>
      console.log(`[WS] Client déconnecté : ${socket.id}`)
    );
  });

  // ── Apollo Server ────────────────────────────────────────
  const server = new ApolloServer({
    typeDefs,
    resolvers: buildResolvers(io),
    formatError: (err) => ({
      message: err.message,
      code:    err.extensions?.code || 'INTERNAL_SERVER_ERROR',
    }),
  });

  await server.start();

  // ── CORS + JSON ──────────────────────────────────────────
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
  });
  app.use(express.json());

  // ── Page d'accueil ───────────────────────────────────────
  app.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <title>Traffic Platform API</title>
        <style>
          body { font-family: Arial, sans-serif; background: #0f172a; color: #e2e8f0; padding: 2rem; }
          h1   { color: #38bdf8; }
          a    { color: #7dd3fc; }
          .badge { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 1rem; margin: 0.5rem 0; }
          .ok  { color: #4ade80; }
        </style>
      </head>
      <body>
        <h1>🚦 Traffic Platform — API Gateway GraphQL</h1>
        <p>Architecture microservices | TEK-UP University 2024-2025</p>
        <div class="badge">
          <p class="ok">✅ GraphQL Playground : <a href="/graphql">/graphql</a></p>
          <p class="ok">✅ WebSocket actif sur ws://localhost:4000</p>
        </div>
        <h3>Services</h3>
        <div class="badge">
          🔐 Auth         → <a href="http://localhost:3001/health">:3001</a><br>
          🚗 Vehicle      → <a href="http://localhost:3002/health">:3002</a><br>
          🚦 Traffic      → <a href="http://localhost:3003/health">:3003</a><br>
          🚨 Incident     → <a href="http://localhost:3004/health">:3004</a><br>
          🔔 Notification → <a href="http://localhost:3005/health">:3005</a>
        </div>
        <h3>WebSocket (temps réel)</h3>
        <div class="badge">
          Événements : <code>new_incident</code> | <code>incident_updated</code> | <code>traffic_alert</code>
        </div>
      </body>
      </html>
    `);
  });

  // ── GraphQL ──────────────────────────────────────────────
  app.use('/graphql', expressMiddleware(server, {
    context: async ({ req }) => {
      const authHeader = req.headers.authorization || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
      return { token };
    },
  }));

  const PORT = process.env.PORT || 4000;
  httpServer.listen(PORT, () => {
    console.log(`🚀 GraphQL Gateway  : http://localhost:${PORT}/graphql`);
    console.log(`🌐 Page d'accueil   : http://localhost:${PORT}`);
    console.log(`🔌 WebSocket        : ws://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Erreur démarrage gateway :', err.message);
  process.exit(1);
});
