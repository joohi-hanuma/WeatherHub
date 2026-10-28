import os
from flask import Flask, jsonify, render_template
from dotenv import load_dotenv

load_dotenv()


def create_app():
    app = Flask(__name__)
    app.config.from_object("config.Config")

    from routes.weather_current import current_weather_bp
    from routes.weather_forecast import weather_forecast_bp
    from routes.favorites_create import favorites_create_bp
    from routes.favorites_read import favorites_read_bp
    from routes.favorites_update import favorites_update_bp
    from routes.favorites_delete import favorites_delete_bp

    app.register_blueprint(current_weather_bp)
    app.register_blueprint(weather_forecast_bp)
    app.register_blueprint(favorites_create_bp)
    app.register_blueprint(favorites_read_bp)
    app.register_blueprint(favorites_update_bp)
    app.register_blueprint(favorites_delete_bp)

    @app.get("/")
    def index():
        return render_template("index.html")

    @app.get("/api/health")
    def health():
        return jsonify({"success": True, "message": "WeatherHub API is running"}), 200

    @app.errorhandler(404)
    def not_found(_error):
        return jsonify({"success": False, "error": "Resource not found"}), 404

    @app.errorhandler(500)
    def internal_error(_error):
        return jsonify({"success": False, "error": "An unexpected server error occurred"}), 500

    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5000")), debug=os.getenv("FLASK_DEBUG", "false").lower() == "true")
