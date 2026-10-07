import psycopg2
conn = psycopg2.connect("postgresql://neondb_owner:npg_Uc8aqKlud7wH@ep-solitary-king-azv4zx0l.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require")
cur = conn.cursor()
cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")
for r in cur.fetchall(): print(r[0])
