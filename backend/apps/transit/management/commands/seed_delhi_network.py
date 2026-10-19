from django.core.management.base import BaseCommand
from apps.transit.services.network_seeder import seed_delhi_transit_network


class Command(BaseCommand):
    help = "Seeds Delhi transit network routes, stops, and sequences into PostGIS"

    def handle(self, *args, **options):
        self.stdout.write("Seeding Delhi Transit Network...")
        res = seed_delhi_transit_network()
        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully seeded: {res['routes']} routes, {res['stops']} stops, {res['route_stops']} route-stops"
            )
        )
