from mysql.connector import Error as MySQLError
from flask import Blueprint, jsonify
from database import get_connection, row_to_dict

favorites_read_bp = Blueprint("favorites_read", __name__)


@favorites_read_bp.get("/api/favorites")
def list_favorites():
    conn = cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT id, city, country, nickname, created_at FROM favorites ORDER BY created_at DESC, id DESC")
        records = [row_to_dict(row) for row in cursor.fetchall()]
        return jsonify({"success": True, "data": records, "count": len(records)}), 200
    except MySQLError:
        return jsonify({"success": False, "error": "Could not retrieve favourites. Check the database connection."}), 503
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()


@favorites_read_bp.get("/api/favorites/<int:favorite_id>")
def get_favorite(favorite_id):
    conn = cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT id, city, country, nickname, created_at FROM favorites WHERE id = %s", (favorite_id,))
        record = row_to_dict(cursor.fetchone())
        if not record:
            return jsonify({"success": False, "error": "Favourite not found."}), 404
        return jsonify({"success": True, "data": record}), 200
    except MySQLError:
        return jsonify({"success": False, "error": "Could not retrieve the favourite. Check the database connection."}), 503
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()
