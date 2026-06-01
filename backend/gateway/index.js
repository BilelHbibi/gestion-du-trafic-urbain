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
//  HELPERS
// ═══════════════════════════════════════════════════════════
function auth(token) {
  return token ? { headers: { authorization: `Bearer ${token}` }, timeout: 5000 }
               : { timeout: 5000 };
}

// Extrait un message lisible depuis une erreur axios et le relance
function svcErr(err) {
  const msg = err?.response?.data?.error
    || err?.response?.data?.message
    || err?.message
    || (err?.code === 'ECONNREFUSED' ? 'Service non démarré — lance start-all.bat' : 'Service indisponible');
  console.error(`[Gateway] ${err?.code || ''} ${msg}`);
  throw new Error(msg);
}

// ═══════════════════════════════════════════════════════════
//  RESOLVERS
// ═══════════════════════════════════════════════════════════
function buildResolvers(io) {
  return {
    Query: {
      // ── Auth ────────────────────────────────────────────
      me: async (_, __, { token }) => {
        try { return (await axios.get(`${AUTH}/me`, auth(token))).data; }
        catch (e) { svcErr(e); }
      },

      getUsers: async (_, __, { token }) => {
        try { return (await axios.get(`${AUTH}/users`, auth(token))).data; }
        catch (e) { svcErr(e); }
      },

      // ── Véhicules ───────────────────────────────────────
      getVehicles: async (_, __, { token }) => {
        try {
          const { data } = await axios.get(`${VEHICLE}/vehicles`, auth(token));
          return Array.isArray(data) ? data : (data.data || []);
        } catch (e) { svcErr(e); }
      },

      getVehicle: async (_, { id }, { token }) => {
        try { return (await axios.get(`${VEHICLE}/vehicles/${id}`, auth(token))).data; }
        catch (e) { svcErr(e); }
      },

      getVehicleHistory: async (_, { id, limit = 50 }, { token }) => {
        try { return (await axios.get(`${VEHICLE}/vehicles/${id}/history?limit=${limit}`, auth(token))).data; }
        catch (e) { svcErr(e); }
      },

      getLastPosition: async (_, { id }, { token }) => {
        try { return (await axios.get(`${VEHICLE}/vehicles/${id}/last-position`, auth(token))).data; }
        catch (e) { svcErr(e); }
      },

      getVehicleStats: async (_, __, { token }) => {
        try { return (await axios.get(`${VEHICLE}/stats`, auth(token))).data; }
        catch (e) { svcErr(e); }
      },

      // ── Trafic ──────────────────────────────────────────
      getZones: async (_, __, { token }) => {
        try { return (await axios.get(`${TRAFFIC}/zones`, auth(token))).data; }
        catch (e) { svcErr(e); }
      },

      getZoneSummary: async (_, __, { token }) => {
        try { return (await axios.get(`${TRAFFIC}/zones/summary`, auth(token))).data; }
        catch (e) { svcErr(e); }
      },

      getCongestedZones: async (_, __, { token }) => {
        try { return (await axios.get(`${TRAFFIC}/zones/congested`, auth(token))).data; }
        catch (e) { svcErr(e); }
      },

      getZoneMeasures: async (_, { zone_id, limit = 30 }, { token }) => {
        try { return (await axios.get(`${TRAFFIC}/zones/${zone_id}/measures?limit=${limit}`, auth(token))).data; }
        catch (e) { svcErr(e); }
      },

      getTrafficStats: async (_, __, { token }) => {
        try { return (await axios.get(`${TRAFFIC}/stats`, auth(token))).data; }
        catch (e) { svcErr(e); }
      },

      // ── Incidents ───────────────────────────────────────
      getIncidents: async (_, { type, status }, { token }) => {
        try {
          const params = new URLSearchParams();
          if (type)   params.append('type', type);
          if (status) params.append('status', status);
          return (await axios.get(`${INCIDENT}/incidents?${params}`, auth(token))).data;
        } catch (e) { svcErr(e); }
      },

      getIncident: async (_, { id }, { token }) => {
        try { return (await axios.get(`${INCIDENT}/incidents/${id}`, auth(token))).data; }
        catch (e) { svcErr(e); }
      },

      getIncidentStats: async (_, __, { token }) => {
        try { return (await axios.get(`${INCIDENT}/incidents/stats`, auth(token))).data; }
        catch (e) { svcErr(e); }
      },

      // ── Notifications ────────────────────────────────────
      getNotifications: async (_, __, { token }) => {
        try { return (await axios.get(`${NOTIF}/notifications`, auth(token))).data; }
        catch (e) { svcErr(e); }
      },

      getUnreadNotifications: async (_, __, { token }) => {
        try { return (await axios.get(`${NOTIF}/notifications/unread`, auth(token))).data; }
        catch (e) { svcErr(e); }
      },

      getNotificationCount: async (_, __, { token }) => {
        try { return (await axios.get(`${NOTIF}/notifications/count`, auth(token))).data; }
        catch (e) { svcErr(e); }
      },

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
            axios.get(`${AUTH}/users`,               auth(token)),
            axios.get(`${VEHICLE}/stats`,            auth(token)),
            axios.get(`${TRAFFIC}/stats`,            auth(token)),
            axios.get(`${INCIDENT}/incidents/stats`, auth(token)),
            axios.get(`${NOTIF}/notifications/count`, auth(token)),
          ]);

        return {
          total_users:         users.status         === 'fulfilled' ? (Array.isArray(users.value.data) ? users.value.data.length : 0) : 0,
          total_vehicles:      vehicleStats.status  === 'fulfilled' ? (vehicleStats.value.data.total_vehicles || 0) : 0,
          total_zones:         trafficStats.status  === 'fulfilled' ? (trafficStats.value.data.total_zones   || 0) : 0,
          total_incidents:     incidentStats.status === 'fulfilled' ? (incidentStats.value.data.total        || 0) : 0,
          total_notifications: notifCount.status    === 'fulfilled' ? (notifCount.value.data.total           || 0) : 0,
          congested_zones:     trafficStats.status  === 'fulfilled' ? (trafficStats.value.data.congested     || 0) : 0,
        };
      },
    },

    Mutation: {
      // ── Auth ────────────────────────────────────────────
      register: async (_, args) => {
        try { return (await axios.post(`${AUTH}/register`, args)).data; }
        catch (e) { svcErr(e); }
      },

      login: async (_, args) => {
        try { return (await axios.post(`${AUTH}/login`, args)).data; }
        catch (e) { svcErr(e); }
      },

      deleteUser: async (_, { id }, { token }) => {
        try { return (await axios.delete(`${AUTH}/users/${id}`, auth(token))).data; }
        catch (e) { svcErr(e); }
      },

      // ── Véhicules ───────────────────────────────────────
      addVehicle: async (_, args, { token }) => {
        try { return (await axios.post(`${VEHICLE}/vehicles`, args, auth(token))).data; }
        catch (e) { svcErr(e); }
      },

      updateVehicle: async (_, { id, ...args }, { token }) => {
        try { return (await axios.put(`${VEHICLE}/vehicles/${id}`, args, auth(token))).data; }
        catch (e) { svcErr(e); }
      },

      deleteVehicle: async (_, { id }, { token }) => {
        try { return (await axios.delete(`${VEHICLE}/vehicles/${id}`, auth(token))).data; }
        catch (e) { svcErr(e); }
      },

      addGpsPosition: async (_, { vehicle_id, ...args }, { token }) => {
        try { return (await axios.post(`${VEHICLE}/vehicles/${vehicle_id}/position`, args, auth(token))).data; }
        catch (e) { svcErr(e); }
      },

      // ── Trafic ──────────────────────────────────────────
      createZone: async (_, args, { token }) => {
        try { return (await axios.post(`${TRAFFIC}/zones`, args, auth(token))).data; }
        catch (e) { svcErr(e); }
      },

      deleteZone: async (_, { id }, { token }) => {
        try { return (await axios.delete(`${TRAFFIC}/zones/${id}`, auth(token))).data; }
        catch (e) { svcErr(e); }
      },

      addTrafficMeasure: async (_, { zone_id, density }, { token }) => {
        try {
          const result = (await axios.post(`${TRAFFIC}/zones/${zone_id}/measure`, { density }, auth(token))).data;
          if (result.level === 'Eleve') {
            io.emit('traffic_alert', { zone_id, density, level: result.level, zone: result.zone, timestamp: new Date().toISOString() });
          }
          return result;
        } catch (e) { svcErr(e); }
      },

      // ── Incidents ───────────────────────────────────────
      reportIncident: async (_, args, { token }) => {
        try {
          const result = (await axios.post(`${INCIDENT}/incidents`, args, auth(token))).data;
          io.emit('new_incident', {
            id: result.id, type: args.type, description: args.description || '',
            latitude: args.latitude || null, longitude: args.longitude || null,
            status: 'Signale', timestamp: new Date().toISOString(),
          });
          return result;
        } catch (e) { svcErr(e); }
      },

      updateIncidentStatus: async (_, { id, status }, { token }) => {
        try {
          const result = (await axios.patch(`${INCIDENT}/incidents/${id}/status`, { status }, auth(token))).data;
          io.emit('incident_updated', { id, status, timestamp: new Date().toISOString() });
          return result;
        } catch (e) { svcErr(e); }
      },

      deleteIncident: async (_, { id }, { token }) => {
        try { return (await axios.delete(`${INCIDENT}/incidents/${id}`, auth(token))).data; }
        catch (e) { svcErr(e); }
      },

      // ── Notifications ────────────────────────────────────
      markNotificationRead: async (_, { id }, { token }) => {
        try { return (await axios.patch(`${NOTIF}/notifications/${id}/read`, {}, auth(token))).data; }
        catch (e) { svcErr(e); }
      },

      markAllNotificationsRead: async (_, __, { token }) => {
        try { return (await axios.patch(`${NOTIF}/notifications/read-all`, {}, auth(token))).data; }
        catch (e) { svcErr(e); }
      },

      deleteNotification: async (_, { id }, { token }) => {
        try { return (await axios.delete(`${NOTIF}/notifications/${id}`, auth(token))).data; }
        catch (e) { svcErr(e); }
      },
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
