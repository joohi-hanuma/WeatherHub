from mysql.connector import IntegrityError, Error as MySQLError
from flask import Blueprint, jsonify, request
from database import get_connection, row_to_dict

favorites_create_bp = Blueprint("favorites_create", __name__)


@favorites_create_bp.post("/api/favorites")
def create_favorite():
    if not request.is_json:
        return jsonify({"success": False, "error": "Content-Type must be application/json."}), 415
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return jsonify({"success": False, "error": "Request body must be a valid JSON object."}), 400
    city = str(body.get("city", "")).strip()
    country = str(body.get("country", "")).strip().upper()
    nickname = str(body.get("nickname", "")).strip() or None
    if not city or not country:
        return jsonify({"success": False, "error": "City and country are required."}), 400
    if len(city) > 120 or len(country) > 2 or (nickname and len(nickname) > 80):
        return jsonify({"success": False, "error": "City, country, or nickname exceeds the allowed length."}), 400
    conn = cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("INSERT INTO favorites (city, country, nickname) VALUES (%s, %s, %s)", (city, country, nickname))
        favorite_id = cursor.lastrowid
        conn.commit()
        cursor.execute("SELECT id, city, country, nickname, created_at FROM favorites WHERE id = %s", (favorite_id,))
        record = row_to_dict(cursor.fetchone())
        return jsonify({"success": True, "data": record}), 201
    except IntegrityError:
        if conn:
            conn.rollback()
        return jsonify({"success": False, "error": "That city and country are already in your favourites."}), 409
    except MySQLError:
        if conn:
            conn.rollback()
        return jsonify({"success": False, "error": "Could not save the favourite. Check the database connection."}), 503
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()
