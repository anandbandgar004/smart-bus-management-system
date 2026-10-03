const BusHistory = require('../models/BusHistory');

// ----- Tunables -----
const GRID_SIZE_DEG = 0.01;
const EWMA_ALPHA = 0.5;
const COVERAGE_LOW = 1.0;        
const COVERAGE_NEIGHBOR_HIGH = 3.0; 
const STUCK_MIN = 5 * 60 * 1000; 
const HEADWAY_TARGET_MIN = 10;   
const SOLUTION_SEARCH_RADIUS_M = 2000; 
const EMIT_INTERVAL_MS = 60 * 1000; 

let io = null;

// In-memory state
const lastPositions = new Map(); 
const stuckSince = new Map();    
const grid = new Map();          
const routeMinuteCounts = new Map(); 


let lastSuggestions = { ts: new Date(), items: [] };

// --- Helper Functions ---
function haversineMeters(lat1, lon1, lat2, lon2) {
  if (![lat1, lon1, lat2, lon2].every(n => typeof n === 'number' && isFinite(n))) return 0;
  const R = 6371e3;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function keyForCell(lat, lng) {
  const i = Math.floor(lat / GRID_SIZE_DEG);
  const j = Math.floor(lng / GRID_SIZE_DEG);
  return `${i}|${j}`;
}
function cellCenter(k) {
    const [i,j] = k.split('|').map(Number);
    return { lat: (i + 0.5) * GRID_SIZE_DEG, lng: (j + 0.5) * GRID_SIZE_DEG };
}
function neighbors(i, j) {
  const res = [];
  for (let di = -1; di <= 1; di++) {
    for (let dj = -1; dj <= 1; dj++) {
      if (di === 0 && dj === 0) continue;
      res.push(`${i + di}|${j + dj}`);
    }
  }
  return res;
}
// --- End Helper Functions ---



async function onBusUpdate(bus) {
  if (!bus || !bus.busId || !bus.currentLocation) return;
  const { busId, routeId, currentLocation, speed, delay } = bus;
  const ts = new Date(currentLocation.timestamp || Date.now());

  // --- history sampling ---
  const prev = lastPositions.get(busId);
  if (!prev || (ts - prev.ts) >= 60 * 1000) {
    try { await BusHistory.create({ busId, routeId, lat: currentLocation.lat, lng: currentLocation.lng, speed, delay, ts }); } catch (e) { /* ignore */ }
  }

  // update last position with all relevant info
  lastPositions.set(busId, { lat: currentLocation.lat, lng: currentLocation.lng, ts, routeId, delay });

  if (typeof speed === 'number' && speed <= 1) { 
    if (!stuckSince.has(busId)) stuckSince.set(busId, Date.now());
  } else {
    stuckSince.delete(busId);
  }

  // grid counting
  if (typeof currentLocation.lat === 'number' && typeof currentLocation.lng === 'number') {
    const k = keyForCell(currentLocation.lat, currentLocation.lng);
    if (!grid.has(k)) grid.set(k, { count: 0, ewma: 0 });
    grid.get(k).count++;
  }

  // route headway proxy
  const nowMin = Math.floor(Date.now() / 60000) * 60000;
  if (!routeMinuteCounts.has(routeId)) {
    routeMinuteCounts.set(routeId, { windowStart: nowMin, count: 0, ewmaCount: 0 });
  }
  const rec = routeMinuteCounts.get(routeId);
  if (rec.windowStart !== nowMin) {
    rec.windowStart = nowMin;
    rec.count = 0;
  }
  rec.count++;
}



function findBestBusToDivert(originLat, originLng, excludeRouteId) {
    let bestCandidate = null;
    let minDistance = Infinity;

    for (const [busId, pos] of lastPositions.entries()) {
        if (pos.routeId === excludeRouteId) continue; 

        const distance = haversineMeters(originLat, originLng, pos.lat, pos.lng);
        
        if (distance < SOLUTION_SEARCH_RADIUS_M && distance < minDistance && (pos.delay || 0) < 10) {
            minDistance = distance;
            bestCandidate = { busId, ...pos };
        }
    }
    return bestCandidate;
}


function computeAndEmit() {
  const now = Date.now();
  const items = [];

  
  for (const [, cell] of grid) { cell.ewma = EWMA_ALPHA * cell.count + (1 - EWMA_ALPHA) * (cell.ewma || 0); cell.count = 0; }
  for (const [, rec] of routeMinuteCounts) { rec.ewmaCount = EWMA_ALPHA * rec.count + (1 - EWMA_ALPHA) * (rec.ewmaCount || 0); }

  
  for (const [busId, since] of stuckSince) {
    if (now - since >= STUCK_MIN) {
      const pos = lastPositions.get(busId);
      const alert = {
        type: 'stuck_bus',
        severity: 'high',
        message: `Possible incident: ${busId} stationary for > ${Math.round((now - since) / 60000)} min`,
        busId,
        details: { routeId: pos?.routeId || 'UNKNOWN', minutes: Math.round((now - since) / 60000) },
        solution: null,
      };
      
      if (pos) {
          const candidate = findBestBusToDivert(pos.lat, pos.lng, pos.routeId);
          if (candidate) {
              alert.solution = {
                  action: "Divert & Reroute",
                  suggestion: `Divert bus ${candidate.busId} (Route ${candidate.routeId}) to bypass the incident area and continue service on Route ${pos.routeId}.`,
                  targetBusId: candidate.busId,
              };
          }
      }
      items.push(alert);
    }
  }
  
  
  for (const [routeId, rec] of routeMinuteCounts) {
    const count = rec.ewmaCount || 0;
    if (count <= 0) continue;
    const estHeadway = 60 / count;
    
    if (estHeadway > HEADWAY_TARGET_MIN * 1.5) { 
      const alert = {
        type: 'headway_risk',
        severity: 'high',
        message: `Severe headway gap on route ${routeId}`,
        routeId,
        details: { estimatedHeadwayMin: +estHeadway.toFixed(1), targetMin: HEADWAY_TARGET_MIN },
        solution: null,
      };
      
      let anchorBus = null;
      let maxDelay = -1;
      for (const bus of lastPositions.values()) {
          if (bus.routeId === routeId && (bus.delay || 0) > maxDelay) {
              maxDelay = bus.delay;
              anchorBus = bus;
          }
      }
      if(anchorBus) {
          const candidate = findBestBusToDivert(anchorBus.lat, anchorBus.lng, routeId);
          if (candidate) {
              alert.solution = {
                  action: "Fill Service Gap",
                  suggestion: `Divert bus ${candidate.busId} (Route ${candidate.routeId}) to cover upcoming stops on Route ${routeId} and reduce wait times.`,
                  targetBusId: candidate.busId,
              };
          }
      }
      items.push(alert);
    }
  }

  
  for (const [k, cell] of grid) {
    if ((cell.ewma || 0) < COVERAGE_LOW) {
      const [si, sj] = k.split('|').map(Number);
      const hasHighNeighbor = neighbors(si, sj).some(nk => {
          const n = grid.get(nk);
          return n && (n.ewma || 0) >= COVERAGE_NEIGHBOR_HIGH;
      });
      if (hasHighNeighbor) {
        const center = cellCenter(k);
        const alert = {
          type: 'coverage_gap',
          severity: 'medium',
          message: 'Low service density next to a busy area',
          cellKey: k,
          details: { ewma: +(cell.ewma || 0).toFixed(2) },
          solution: null
        };
        
        const candidate = findBestBusToDivert(center.lat, center.lng, null); 
        if (candidate) {
            alert.solution = {
                action: "Minor Reroute",
                suggestion: `Order a minor reroute for bus ${candidate.busId} (Route ${candidate.routeId}) to pass through the low-coverage zone.`,
                targetBusId: candidate.busId,
            };
        }
        items.push(alert);
      }
    }
  }

  lastSuggestions = { ts: new Date(), items: items.sort((a,b) => (b.severity === 'high') - (a.severity === 'high')) };
  if (io) {
    io.emit('ai-suggestions', lastSuggestions);
  }
}

let intervalHandle = null;
function init(socketIoInstance) {
  io = socketIoInstance;
  if (intervalHandle) clearInterval(intervalHandle);
  intervalHandle = setInterval(computeAndEmit, EMIT_INTERVAL_MS);
  console.log('Enhanced AI Service initialized (with solution recommendations).');
}

function getSuggestions() {
  return lastSuggestions;
}

module.exports = { init, onBusUpdate, getSuggestions };