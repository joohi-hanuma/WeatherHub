# WeatherHub

A Flask + MySQL weather dashboard using OpenWeather. The OpenWeather API key is used only by the Flask backend; it is never sent to browser code.

## Project structure

```text
weatherhub/
├── app.py                       # Flask app, page route, health check, Blueprint registration
├── config.py                    # environment-based configuration
├── database.py                  # MySQL connection helper
├── schema.sql                   # database and favourites table
├── routes/
│   ├── weather_current.py       # GET /api/weather/current
│   ├── weather_forecast.py      # GET /api/weather/forecast
│   ├── favorites_create.py     # POST /api/favorites
│   ├── favorites_read.py       # GET /api/favorites and /api/favorites/<id>
│   ├── favorites_update.py     # PUT /api/favorites/<id>
│   └── favorites_delete.py     # DELETE /api/favorites/<id>
├── templates/index.html        # dashboard served at /
├── static/css/style.css
├── static/js/app.js
├── postman/WeatherHub.postman_collection.json
└── .env.example
```

## Requirements

- Python 3.10 or newer
- MySQL 8 (or a compatible MySQL server)
- An OpenWeather API key with access to Current Weather and 5 Day / 3 Hour Forecast

## Run locally

1. Create and activate a virtual environment:

   ```bash
   python -m venv .venv
   # macOS/Linux
   source .venv/bin/activate
   # Windows PowerShell: .venv\Scripts\Activate.ps1
   ```

2. Install Python packages:

   ```bash
   pip install -r requirements.txt
   ```

3. Create the MySQL database and table:

   ```bash
   mysql -u root -p < schema.sql
   ```

4. Copy `.env.example` to `.env`, then set your own OpenWeather key and MySQL connection values. Never commit `.env` or share its values.

5. Start the app:

   ```bash
   python app.py
   ```

6. Open <http://localhost:5000>. Health check: <http://localhost:5000/api/health>.

## API routes

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/health` | Flask health check |
| GET | `/api/weather/current?city=Vijayawada&country=IN` | Current conditions |
| GET | `/api/weather/forecast?city=Vijayawada&country=IN` | Five-day forecast (OpenWeather's 3-hour readings) |
| POST | `/api/favorites` | Add a favourite (`city`, `country`, optional `nickname`) |
| GET | `/api/favorites` | List favourites |
| GET | `/api/favorites/<id>` | Read one favourite |
| PUT | `/api/favorites/<id>` | Update a favourite (`city`, `country`, optional `nickname`) |
| DELETE | `/api/favorites/<id>` | Delete a favourite |

Favourite JSON example:

```json
{"city":"Vijayawada","country":"IN","nickname":"Home"}
```

Responses use JSON with a `success` field and either `data` or `error`/`message`. Duplicate city/country pairs return HTTP 409; missing records return 404. The unique constraint is on city and country as entered, so use consistent city spelling.

## Postman

Import `postman/WeatherHub.postman_collection.json` into Postman. The collection uses `baseUrl` (`http://localhost:5000`) and `favoriteId` variables; after creating a favourite, set `favoriteId` to the returned `data.id` before trying read-one, update, and delete requests. Tests include successful and invalid weather searches, favourites CRUD, duplicate handling, and missing IDs. Configure your local `.env` before running requests that need OpenWeather or MySQL.

## Notes

- The frontend uses Bootstrap 5 and Bootstrap Icons from their public CDNs.
- Weather units are metric; wind is in metres/second, visibility is kilometres, and temperatures are Celsius.
- The forecast endpoint returns normalized forecast entries from OpenWeather. The frontend groups those real three-hour readings by day and displays up to five days.
- Keep `FLASK_DEBUG=false` outside local development. Replace the development-only fallback secret with a long random value in your environment.


## Screenshots

### Weather Dashboard
![Weather Dashboard](Screenshots/dashboard.png)

### City Search
![City Search](Screenshots/city-search.png)

### Forecast View
![Forecast View](Screenshots/Forecast-view.png)

### Favourite Cities
![Favourite Cities](Screenshots/favourite-cities.png)