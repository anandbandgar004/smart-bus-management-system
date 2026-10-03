const axios = require('axios');
const GtfsRealtimeBindings = require('gtfs-realtime-bindings');
const Bus = require('../models/Bus');

const API_KEY = process.env.GTFS_API_KEY || '';
const BUS_LIMIT = parseInt(process.env.BUS_LIMIT, 10) || 200;


const VEHICLE_POSITIONS_URL = `https://otd.delhi.gov.in/api/realtime/VehiclePositions.pb?key=${API_KEY}`;
const TRIP_UPDATES_URL    = `https://otd.delhi.gov.in/api/realtime/TripUpdates.pb?key=${API_KEY}`;

let io = null;
let aiService = null;


const lastPositions = new Map();

// Helpers
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }


function haversineMeters(lat1, lon1, lat2, lon2) {
  if (![lat1, lon1, lat2, lon2].every(n => typeof n === 'number' && isFinite(n))) return 0;
  const R = 6371e3; // meters
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function fetchGtfs(url) {
  const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000 });
  return GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(res.data));
}

function buildDelayMap(tripUpdatesFeed) {
  const delayByTrip = new Map();
  if (!tripUpdatesFeed?.entity) return delayByTrip;

  for (const ent of tripUpdatesFeed.entity) {
    const tu = ent.tripUpdate || ent.trip_update || ent.trip || ent.trip_update;
    if (!tu) continue;

    const trip = tu.trip || tu.trip_update || {};
    const tripId = trip.tripId || trip.trip_id || null;
    if (!tripId) continue;

    let delayMinutes = null;
    const stopTimeUpdate = tu.stopTimeUpdate || tu.stop_time_update || tu.stop_time_update;
    if (Array.isArray(stopTimeUpdate)) {
      for (const stu of stopTimeUpdate) {
        if (stu.arrival?.delay != null) { delayMinutes = Math.round(stu.arrival.delay / 60); break; }
        if (stu.departure?.delay != null) { delayMinutes = Math.round(stu.departure.delay / 60); break; }
      }
    }

    if (delayMinutes == null) {
      if (typeof tu.delay === 'number') delayMinutes = Math.round(tu.delay / 60);
      else if (typeof tu.trip?.delay === 'number') delayMinutes = Math.round(tu.trip.delay / 60);
    }

    if (typeof delayMinutes === 'number') {
      delayByTrip.set(tripId, Math.max(-60, Math.min(240, delayMinutes))); 
    }
  }
  return delayByTrip;
}

const init = (socketIoInstance, aiSvc) => {
  io = socketIoInstance;
  aiService = aiSvc;
  console.log(`GTFS Service Initialized (Delhi feed, Max buses: ${BUS_LIMIT})`);

  
  fetchAndProcessBusData().catch(err => console.error('Initial GTFS fetch error:', err));

  
  setInterval(fetchAndProcessBusData, 15000);
};

const fetchAndProcessBusData = async () => {
  try {
    console.log('Fetching live GTFS data (Delhi)…');

    const [vehicleFeed, tripUpdatesFeed] = await Promise.all([
      fetchGtfs(VEHICLE_POSITIONS_URL).catch(err => { console.error('VehiclePositions fetch failed:', err.message || err); return null; }),
      fetchGtfs(TRIP_UPDATES_URL).catch(err => { console.warn('TripUpdates fetch failed (optional):', err.message || err); return null; })
    ]);

    const delayByTrip = buildDelayMap(tripUpdatesFeed);
    const rawEntities = vehicleFeed?.entity || [];

    if (rawEntities.length === 0) {
      console.log('No vehicle data.');
      if (io) io.emit('analytics-summary', { totalInFeed: 0, emitted: 0, perRoute: {} });
      return;
    }

    const selected = rawEntities.slice(0, BUS_LIMIT);
    
    
    const dbOperations = []; 
    const busesToProcess = []; 
    

    for (const entity of selected) {
      const v = entity.vehicle || entity['vehicle'] || entity;
      if (!v || !v.position) continue;

      const tripId  = v.trip?.tripId || v.trip?.trip_id || null;
      const routeId = v.trip?.routeId || v.trip?.route_id || 'UNKNOWN';

      let delay = 0;
      if (tripId && delayByTrip.has(tripId)) {
        delay = delayByTrip.get(tripId);
      } else {
        delay = randInt(-2, 10);
      }

      const pos = v.position || {};
      const lat = (typeof pos.latitude === 'number') ? pos.latitude : (typeof pos.lat === 'number' ? pos.lat : null);
      const lng = (typeof pos.longitude === 'number') ? pos.longitude : (typeof pos.lon === 'number' ? pos.lon : (typeof pos.lng === 'number' ? pos.lng : null));
      const timestampSec = v.timestamp || entity.timestamp || Math.floor(Date.now() / 1000);
      const tsMs = Number(timestampSec) * 1000;

      const busId = v.vehicle?.id || v.vehicle?.vehicle?.id || entity.id || `BUS_${randInt(10000,99999)}`;

      let speedKmh = 0;
      if (typeof pos.speed === 'number' && !isNaN(pos.speed)) {
        speedKmh = Math.round(pos.speed * 3.6);
      } else if (typeof pos.speed === 'string' && !isNaN(Number(pos.speed))) {
        speedKmh = Math.round(Number(pos.speed) * 3.6);
      }
      
      if ((!speedKmh || speedKmh === 0) && lat != null && lng != null) {
        const prev = lastPositions.get(busId);
        if (prev && typeof prev.lat === 'number' && typeof prev.lng === 'number' && typeof prev.ts === 'number') {
          const dtSec = (tsMs - prev.ts) / 1000;
          if (dtSec > 0.5) {
            const distM = haversineMeters(prev.lat, prev.lng, lat, lng);
            if (distM >= 1) {
              const calcKmh = Math.round((distM / dtSec) * 3.6);
              if (isFinite(calcKmh) && calcKmh >= 0) {
                speedKmh = calcKmh;
              }
            }
          }
        }
      }

      if (!speedKmh || !isFinite(speedKmh)) {
        speedKmh = randInt(8, 35);
      }

      if (lat != null && lng != null) {
        lastPositions.set(busId, { lat, lng, ts: tsMs });
      }

      const busData = {
        busId,
        routeId,
        currentLocation: {
          lat: lat != null ? lat : 0,
          lng: lng != null ? lng : 0,
          timestamp: new Date(tsMs)
        },
        speed: speedKmh,
        status: 'active',
        delay
      };

      
      dbOperations.push({
        updateOne: {
          filter: { busId: busData.busId },
          update: { $set: busData },
          upsert: true
        }
      });


      busesToProcess.push(busData);

    }

    
    if (dbOperations.length > 0) {
      try {
        await Bus.bulkWrite(dbOperations);
      } catch (err) {
        console.warn('Bus DB bulkWrite error:', err && err.message ? err.message : err);
      }
    }

    
    const routeStats = {};
    for (const busData of busesToProcess) {
      if (io) io.emit('bus-location-update', busData);
      if (aiService) {
        try { aiService.onBusUpdate(busData); } catch (e) { /* swallow */ }
      }
      
      // Track route stats for analytics
      const { routeId, delay, speed } = busData;
      if (!routeStats[routeId]) routeStats[routeId] = { count: 0, sumDelay: 0, sumSpeed: 0 };
      routeStats[routeId].count++;
      routeStats[routeId].sumDelay += typeof delay === 'number' ? delay : 0;
      routeStats[routeId].sumSpeed += typeof speed === 'number' ? speed : 0;
    }
    

    const perRoute = {};
    for (const [routeId, s] of Object.entries(routeStats)) {
      const count = s.count || 0;
      perRoute[routeId] = {
        count,
        avgDelay: count > 0 ? +(s.sumDelay / count).toFixed(2) : 0,
        avgSpeed: count > 0 ? +(s.sumSpeed / count).toFixed(2) : 0
      };
    }

    if (io) {
      io.emit('analytics-summary', {
        totalInFeed: rawEntities.length,
        emitted: selected.length,
        perRoute
      });
    }

    console.log(`GTFS processed: feed=${rawEntities.length} emitted=${selected.length}`);
  } catch (err) {
    console.error('Error fetching GTFS:', err && err.message ? err.message : err);
  }
};

module.exports = { init };