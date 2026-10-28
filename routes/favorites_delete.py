from mysql.connector import Error as MySQLError
from flask import Blueprint, jsonify
from database import get_connection

favorites_delete_bp = Blueprint("favorites_delete", __name__)


@favorites_delete_bp.delete("/api/favorites/<int:favorite_id>")
def delete_favorite(favorite_id):
    conn = cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM favorites WHERE id = %s", (favorite_id,))
        if cursor.rowcount == 0:
            conn.rollback()
            return jsonify({"success": False, "error": "Favourite not found."}), 404
        conn.commit()
        return jsonify({"success": True, "message": "Favourite deleted successfully."}), 200
    except MySQLError:
        if conn:
            conn.rollback()
        return jsonify({"success": False, "error": "Could not delete the favourite. Check the database connection."}), 503
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()
