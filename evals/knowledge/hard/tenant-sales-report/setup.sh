#!/bin/bash
# Schema + app_rw role into the run's database (DATABASE_URL is a superuser URL).
set -e
node scripts/db-setup.mjs
