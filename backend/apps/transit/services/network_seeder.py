"""Delhi Transit Network Seeder Service

Populates high-precision stops and route sequences for major Delhi transit corridors:
- DL-534: Anand Vihar ISBT <-> Mehrauli Terminal
- DL-729: Mori Gate Terminal <-> Kapashera Border
- DL-427: Nizamuddin Railway Station <-> Badarpur Border
- DL-TMS: Ring Road Mudrika Orbital Loop
- DL-RL77: New Delhi Railway Station <-> Dwarka Sector 10
- DL-GL23: ISBT Kashmere Gate <-> Nehru Place Terminal
"""

import logging
from django.contrib.gis.geos import Point
from apps.transit.models import Route, Stop, RouteStop

logger = logging.getLogger(__name__)

DELHI_NETWORK_DATA = [
    {
        "id": "DL-534",
        "short_name": "534",
        "long_name": "Anand Vihar ISBT to Mehrauli Terminal",
        "color": "#3B82F6",
        "stops": [
            {"id": "ST-534-01", "name": "Anand Vihar ISBT", "lat": 28.6468, "lng": 77.3150, "zone": "East Delhi"},
            {"id": "ST-534-02", "name": "Karkardooma Court", "lat": 28.6510, "lng": 77.2970, "zone": "East Delhi"},
            {"id": "ST-534-03", "name": "Laxmi Nagar Metro", "lat": 28.6305, "lng": 77.2773, "zone": "East Delhi"},
            {"id": "ST-534-04", "name": "ITO Crossing", "lat": 28.6288, "lng": 77.2410, "zone": "Central Delhi"},
            {"id": "ST-534-05", "name": "Pragati Maidan / Supreme Court", "lat": 28.6180, "lng": 77.2430, "zone": "Central Delhi"},
            {"id": "ST-534-06", "name": "Hazrat Nizamuddin", "lat": 28.5890, "lng": 77.2530, "zone": "South Delhi"},
            {"id": "ST-534-07", "name": "Lajpat Nagar Central Market", "lat": 28.5680, "lng": 77.2425, "zone": "South Delhi"},
            {"id": "ST-534-08", "name": "South Extension", "lat": 28.5700, "lng": 77.2215, "zone": "South Delhi"},
            {"id": "ST-534-09", "name": "AIIMS Metro / Hospital", "lat": 28.5672, "lng": 77.2100, "zone": "South Delhi"},
            {"id": "ST-534-10", "name": "Green Park", "lat": 28.5580, "lng": 77.2065, "zone": "South Delhi"},
            {"id": "ST-534-11", "name": "Hauz Khas Terminal", "lat": 28.5430, "lng": 77.2050, "zone": "South Delhi"},
            {"id": "ST-534-12", "name": "Saket Crossing", "lat": 28.5240, "lng": 77.2100, "zone": "South Delhi"},
            {"id": "ST-534-13", "name": "Mehrauli Terminal", "lat": 28.5180, "lng": 77.1850, "zone": "South Delhi"},
        ],
    },
    {
        "id": "DL-729",
        "short_name": "729",
        "long_name": "Mori Gate Terminal to Kapashera Border",
        "color": "#10B981",
        "stops": [
            {"id": "ST-729-01", "name": "Mori Gate Terminal", "lat": 28.6650, "lng": 77.2180, "zone": "North Delhi"},
            {"id": "ST-729-02", "name": "Old Delhi Railway Station", "lat": 28.6580, "lng": 77.2300, "zone": "North Delhi"},
            {"id": "ST-729-03", "name": "Chandni Chowk", "lat": 28.6505, "lng": 77.2300, "zone": "Central Delhi"},
            {"id": "ST-729-04", "name": "Connaught Place Super Bazar", "lat": 28.6315, "lng": 77.2200, "zone": "Central Delhi"},
            {"id": "ST-729-05", "name": "Patel Nagar", "lat": 28.6540, "lng": 77.1650, "zone": "West Delhi"},
            {"id": "ST-729-06", "name": "Shadipur Depot", "lat": 28.6520, "lng": 77.1510, "zone": "West Delhi"},
            {"id": "ST-729-07", "name": "Moti Nagar", "lat": 28.6560, "lng": 77.1400, "zone": "West Delhi"},
            {"id": "ST-729-08", "name": "Raja Garden", "lat": 28.6510, "lng": 77.1200, "zone": "West Delhi"},
            {"id": "ST-729-09", "name": "Janakpuri West", "lat": 28.6290, "lng": 77.0780, "zone": "West Delhi"},
            {"id": "ST-729-10", "name": "Uttam Nagar East", "lat": 28.6220, "lng": 77.0500, "zone": "West Delhi"},
            {"id": "ST-729-11", "name": "Kapashera Border", "lat": 28.5250, "lng": 77.0850, "zone": "South West Delhi"},
        ],
    },
    {
        "id": "DL-427",
        "short_name": "427",
        "long_name": "Nizamuddin to Badarpur Border",
        "color": "#F59E0B",
        "stops": [
            {"id": "ST-427-01", "name": "Hazrat Nizamuddin Rly Stn", "lat": 28.5890, "lng": 77.2530, "zone": "South Delhi"},
            {"id": "ST-427-02", "name": "Ashram Chowk", "lat": 28.5710, "lng": 77.2600, "zone": "South Delhi"},
            {"id": "ST-427-03", "name": "Maharani Bagh", "lat": 28.5780, "lng": 77.2690, "zone": "South Delhi"},
            {"id": "ST-427-04", "name": "New Friends Colony", "lat": 28.5630, "lng": 77.2710, "zone": "South Delhi"},
            {"id": "ST-427-05", "name": "Okhla More / Jamia", "lat": 28.5580, "lng": 77.2800, "zone": "South Delhi"},
            {"id": "ST-427-06", "name": "Sarita Vihar", "lat": 28.5280, "lng": 77.2950, "zone": "South Delhi"},
            {"id": "ST-427-07", "name": "Mohan Estate", "lat": 28.5130, "lng": 77.3000, "zone": "South Delhi"},
            {"id": "ST-427-08", "name": "Badarpur Border", "lat": 28.4980, "lng": 77.3050, "zone": "South Delhi"},
        ],
    },
    {
        "id": "DL-TMS",
        "short_name": "TMS",
        "long_name": "Ring Road Mudrika Inner Circle",
        "color": "#A855F7",
        "stops": [
            {"id": "ST-TMS-01", "name": "Dhaula Kuan", "lat": 28.5920, "lng": 77.1600, "zone": "South West Delhi"},
            {"id": "ST-TMS-02", "name": "Moti Bagh", "lat": 28.5750, "lng": 77.1700, "zone": "South West Delhi"},
            {"id": "ST-TMS-03", "name": "Hyatt Regency / RK Puram", "lat": 28.5700, "lng": 77.1900, "zone": "South Delhi"},
            {"id": "ST-TMS-04", "name": "AIIMS Ring Road", "lat": 28.5680, "lng": 77.2100, "zone": "South Delhi"},
            {"id": "ST-TMS-05", "name": "South Extension", "lat": 28.5700, "lng": 77.2215, "zone": "South Delhi"},
            {"id": "ST-TMS-06", "name": "Lajpat Nagar Ring Road", "lat": 28.5720, "lng": 77.2400, "zone": "South Delhi"},
            {"id": "ST-TMS-07", "name": "Ashram", "lat": 28.5710, "lng": 77.2600, "zone": "South Delhi"},
            {"id": "ST-TMS-08", "name": "Sarai Kale Khan ISBT", "lat": 28.5910, "lng": 77.2580, "zone": "South Delhi"},
            {"id": "ST-TMS-09", "name": "Pragati Maidan", "lat": 28.6180, "lng": 77.2430, "zone": "Central Delhi"},
            {"id": "ST-TMS-10", "name": "ITO Ring Road", "lat": 28.6300, "lng": 77.2480, "zone": "Central Delhi"},
            {"id": "ST-TMS-11", "name": "Rajghat", "lat": 28.6400, "lng": 77.2480, "zone": "Central Delhi"},
            {"id": "ST-TMS-12", "name": "Kashmere Gate ISBT", "lat": 28.6675, "lng": 77.2290, "zone": "North Delhi"},
            {"id": "ST-TMS-13", "name": "Azadpur", "lat": 28.7050, "lng": 77.1780, "zone": "North Delhi"},
            {"id": "ST-TMS-14", "name": "Punjabi Bagh", "lat": 28.6680, "lng": 77.1300, "zone": "West Delhi"},
        ],
    },
    {
        "id": "DL-RL77",
        "short_name": "RL77",
        "long_name": "New Delhi Railway Stn to Dwarka Sector 10",
        "color": "#F43F5E",
        "stops": [
            {"id": "ST-RL77-01", "name": "New Delhi Railway Station", "lat": 28.6420, "lng": 77.2210, "zone": "Central Delhi"},
            {"id": "ST-RL77-02", "name": "Connaught Place Outer Circle", "lat": 28.6320, "lng": 77.2180, "zone": "Central Delhi"},
            {"id": "ST-RL77-03", "name": "Patel Chowk", "lat": 28.6230, "lng": 77.2140, "zone": "Central Delhi"},
            {"id": "ST-RL77-04", "name": "RML Hospital", "lat": 28.6250, "lng": 77.1990, "zone": "Central Delhi"},
            {"id": "ST-RL77-05", "name": "Dhaula Kuan", "lat": 28.5920, "lng": 77.1600, "zone": "South West Delhi"},
            {"id": "ST-RL77-06", "name": "Delhi Cantt", "lat": 28.5980, "lng": 77.1250, "zone": "South West Delhi"},
            {"id": "ST-RL77-07", "name": "Janakpuri D-Block", "lat": 28.6180, "lng": 77.0950, "zone": "West Delhi"},
            {"id": "ST-RL77-08", "name": "Uttam Nagar Terminal", "lat": 28.6200, "lng": 77.0600, "zone": "West Delhi"},
            {"id": "ST-RL77-09", "name": "Dwarka Mor", "lat": 28.6190, "lng": 77.0350, "zone": "South West Delhi"},
            {"id": "ST-RL77-10", "name": "Dwarka Sector 1", "lat": 28.5950, "lng": 77.0700, "zone": "South West Delhi"},
            {"id": "ST-RL77-11", "name": "Dwarka Sector 10 Terminal", "lat": 28.5810, "lng": 77.0580, "zone": "South West Delhi"},
        ],
    },
    {
        "id": "DL-GL23",
        "short_name": "GL23",
        "long_name": "ISBT Kashmere Gate to Nehru Place Terminal",
        "color": "#06B6D4",
        "stops": [
            {"id": "ST-GL23-01", "name": "Kashmere Gate ISBT", "lat": 28.6675, "lng": 77.2290, "zone": "North Delhi"},
            {"id": "ST-GL23-02", "name": "Red Fort", "lat": 28.6560, "lng": 77.2410, "zone": "Central Delhi"},
            {"id": "ST-GL23-03", "name": "Delhi Gate", "lat": 28.6410, "lng": 77.2410, "zone": "Central Delhi"},
            {"id": "ST-GL23-04", "name": "ITO", "lat": 28.6288, "lng": 77.2410, "zone": "Central Delhi"},
            {"id": "ST-GL23-05", "name": "India Gate", "lat": 28.6129, "lng": 77.2295, "zone": "Central Delhi"},
            {"id": "ST-GL23-06", "name": "Lodhi Garden", "lat": 28.5930, "lng": 77.2200, "zone": "South Delhi"},
            {"id": "ST-GL23-07", "name": "Defence Colony", "lat": 28.5740, "lng": 77.2300, "zone": "South Delhi"},
            {"id": "ST-GL23-08", "name": "Moolchand Hospital", "lat": 28.5660, "lng": 77.2340, "zone": "South Delhi"},
            {"id": "ST-GL23-09", "name": "Nehru Place Terminal", "lat": 28.5500, "lng": 77.2510, "zone": "South Delhi"},
        ],
    },
]


def seed_delhi_transit_network():
    """Seeds routes, stops, and route-stop sequences in PostGIS database."""
    total_routes = 0
    total_stops = 0
    total_sequences = 0

    for rdata in DELHI_NETWORK_DATA:
        route, created = Route.objects.update_or_create(
            id=rdata["id"],
            defaults={
                "short_name": rdata["short_name"],
                "long_name": rdata["long_name"],
                "color": rdata["color"],
                "is_active": True,
            },
        )
        total_routes += 1

        for seq, sdata in enumerate(rdata["stops"], start=1):
            point = Point(sdata["lng"], sdata["lat"], srid=4326)
            stop, s_created = Stop.objects.update_or_create(
                id=sdata["id"],
                defaults={
                    "name": sdata["name"],
                    "location": point,
                    "zone_id": sdata["zone"],
                },
            )
            if s_created:
                total_stops += 1

            RouteStop.objects.update_or_create(
                route=route,
                stop_sequence=seq,
                defaults={"stop": stop},
            )
            total_sequences += 1

    logger.info(
        "Seeded Delhi Transit Network: %d routes, %d stops, %d route stops",
        total_routes,
        total_stops,
        total_sequences,
    )
    return {
        "routes": total_routes,
        "stops": Stop.objects.count(),
        "route_stops": total_sequences,
    }
