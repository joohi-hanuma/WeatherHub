from mysql.connector import IntegrityError, Error as MySQLError
from flask import Blueprint, jsonify, request
from database import get_connection, row_to_dict

favorites_update_bp = Blueprint("favorites_update", __name__)


@favorites_update_bp.put("/api/favorites/<int:favorite_id>")
def update_favorite(favorite_id):
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
        cursor.execute("SELECT id FROM favorites WHERE id = %s", (favorite_id,))
        if not cursor.fetchone():
            return jsonify({"success": False, "error": "Favourite not found."}), 404
        cursor.execute("UPDATE favorites SET city = %s, country = %s, nickname = %s WHERE id = %s", (city, country, nickname, favorite_id))
        conn.commit()
        cursor.execute("SELECT id, city, country, nickname, created_at FROM favorites WHERE id = %s", (favorite_id,))
        return jsonify({"success": True, "data": row_to_dict(cursor.fetchone())}), 200
    except IntegrityError:
        if conn:
            conn.rollback()
        return jsonify({"success": False, "error": "Another favourite already uses that city and country."}), 409
    except MySQLError:
        if conn:
            conn.rollback()
        return jsonify({"success": False, "error": "Could not update the favourite. Check the database connection."}), 503
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()
