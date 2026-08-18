# FoodBridge API

FastAPI service for authentication, role-based access, donation lifecycle rules,
NGO requests, volunteer pickups, and dashboard summaries.

The service uses the workspace PostgreSQL database through `DATABASE_URL`.
Tables are created on startup for the first runnable MVP; the schema is split
into SQLAlchemy models so it can be moved to Alembic migrations without changing
route code.