# Local database

`app_user` is a cluster-wide role. Create it once as a superuser, then apply the schema:

```sql
CREATE ROLE app_user LOGIN PASSWORD 'app';
GRANT USAGE ON SCHEMA public TO app_user;
```

Connect the app with the same `DATABASE_URL` but user `app_user` / password `app`.
