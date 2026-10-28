import requests
from flask import Blueprint, current_app, jsonify, request
from routes.weather_current import upstream_error

weather_forecast_bp = Blueprint("weather_forecast", __name__)


@weather_forecast_bp.get("/api/weather/forecast")
def weather_forecast():
    city = (request.args.get("city") or "").strip()
    country = (request.args.get("country") or "").strip()
    if not city:
        return jsonify({"success": False, "error": "The city query parameter is required."}), 400
    api_key = current_app.config["OPENWEATHER_API_KEY"]
    if not api_key:
        return jsonify({"success": False, "error": "Weather service is not configured on the server."}), 503
    params = {"q": f"{city},{country}" if country else city, "appid": api_key, "units": "metric"}
    try:
        response = requests.get(f"{current_app.config['OPENWEATHER_BASE_URL']}/forecast", params=params, timeout=10)
    except requests.RequestException:
        return jsonify({"success": False, "error": "Could not reach the weather service."}), 502
    if not response.ok:
        message, status = upstream_error(response)
        return jsonify({"success": False, "error": message}), status
    data = response.json()
    entries = []
    for item in data.get("list", []):
        weather = (item.get("weather") or [{}])[0]
        entries.append({
            "datetime": item.get("dt_txt"),
            "timestamp": item.get("dt"),
            "temperature": (item.get("main") or {}).get("temp"),
            "feels_like": (item.get("main") or {}).get("feels_like"),
            "description": weather.get("description", ""),
            "icon": weather.get("icon", "01d"),
            "precipitation_probability": item.get("pop", 0),
            "humidity": (item.get("main") or {}).get("humidity"),
        })
    return jsonify({
        "success": True,
        "city": {"name": (data.get("city") or {}).get("name", city), "country": (data.get("city") or {}).get("country", country)},
        "data": entries
    }), 200
