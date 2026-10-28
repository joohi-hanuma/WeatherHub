import mysql.connector
from flask import current_app


def get_connection():
    """Open a MySQL connection using the active Flask configuration."""
    return mysql.connector.connect(
        host=current_app.config["MYSQL_HOST"],
        port=current_app.config["MYSQL_PORT"],
        user=current_app.config["MYSQL_USER"],
        password=current_app.config["MYSQL_PASSWORD"],
        database=current_app.config["MYSQL_DATABASE"],
        connection_timeout=current_app.config["MYSQL_CONNECT_TIMEOUT"],
        autocommit=False,
    )


def row_to_dict(row):
    if not row:
        return None
    if row.get("created_at"):
        row["created_at"] = row["created_at"].isoformat()
    return row
