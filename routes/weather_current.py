import requests
from flask import Blueprint, current_app, jsonify, request

current_weather_bp = Blueprint("current_weather", __name__)


def upstream_error(response):
    if response.status_code == 401:
        return "Weather service authentication failed. Check the server API key.", 502
    if response.status_code == 404:
        return "City not found. Check the city and country code.", 404
    if response.status_code == 429:
        return "Weather service rate limit reached. Try again shortly.", 503
    return "Weather service is temporarily unavailable.", 502


@current_weather_bp.get("/api/weather/current")
def current_weather():
    city = (request.args.get("city") or "").strip()
    country = (request.args.get("country") or "").strip()
    if not city:
        return jsonify({"success": False, "error": "The city query parameter is required."}), 400
    api_key = current_app.config["OPENWEATHER_API_KEY"]
    if not api_key:
        return jsonify({"success": False, "error": "Weather service is not configured on the server."}), 503
    params = {"q": f"{city},{country}" if country else city, "appid": api_key, "units": "metric"}
    try:
        response = requests.get(f"{current_app.config['OPENWEATHER_BASE_URL']}/weather", params=params, timeout=10)
    except requests.RequestException:
        return jsonify({"success": False, "error": "Could not reach the weather service."}), 502
    if not response.ok:
        message, status = upstream_error(response)
        return jsonify({"success": False, "error": message}), status
    data = response.json()
    weather = (data.get("weather") or [{}])[0]
    return jsonify({
        "success": True,
        "data": {
            "city": data.get("name", city),
            "country": (data.get("sys") or {}).get("country", country),
            "temperature": (data.get("main") or {}).get("temp"),
            "feels_like": (data.get("main") or {}).get("feels_like"),
            "humidity": (data.get("main") or {}).get("humidity"),
            "pressure": (data.get("main") or {}).get("pressure"),
            "wind_speed": (data.get("wind") or {}).get("speed"),
            "visibility": data.get("visibility"),
            "description": weather.get("description", ""),
            "icon": weather.get("icon", "01d"),
            "sunrise": (data.get("sys") or {}).get("sunrise"),
            "sunset": (data.get("sys") or {}).get("sunset"),
            "timezone": data.get("timezone", 0),
        }
    }), 200
