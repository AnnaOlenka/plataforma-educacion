from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = "Evalúa la conexión a PostgreSQL (ENGINE, host, versión, latency)."

    def handle(self, *args, **options):
        db = connection.settings_dict
        self.stdout.write("Motor:  " + str(db.get("ENGINE")))
        self.stdout.write("Host:   " + str(db.get("HOST")))
        self.stdout.write("Puerto: " + str(db.get("PORT")))
        self.stdout.write("DB:     " + str(db.get("NAME")))
        self.stdout.write("User:   " + str(db.get("USER")))

        try:
            connection.ensure_connection()
            with connection.cursor() as cursor:
                cursor.execute("SELECT version();")
                version = cursor.fetchone()[0]
                cursor.execute("SELECT current_database(), current_user, inet_server_addr(), inet_server_port();")
                db_name, db_user, addr, port = cursor.fetchone()
                cursor.execute("SELECT 1;")
                ok = cursor.fetchone()[0]

            self.stdout.write(self.style.SUCCESS("Estado: CONEXION OK"))
            self.stdout.write(f"SELECT 1 -> {ok}")
            self.stdout.write(f"Database: {db_name} | User: {db_user}")
            self.stdout.write(f"Server: {addr}:{port}")
            self.stdout.write(f"Version: {version}")
        except Exception as exc:
            self.stderr.write(self.style.ERROR(f"Estado: FALLO - {exc}"))
            raise SystemExit(1)
