from datetime import datetime, timezone
from pathlib import Path
import os
import sqlite3
import uuid

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename

BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
DB_PATH = BASE_DIR / "assets.db"
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "gif"}
MAX_IMAGE_BYTES = 8 * 1024 * 1024

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = MAX_IMAGE_BYTES
CORS(app, resources={r"/api/*": {"origins": "*"}})  # Restrict this for production.

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_db() as db:
        db.execute("""
            CREATE TABLE IF NOT EXISTS assets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                asset_id TEXT NOT NULL UNIQUE,
                category TEXT NOT NULL,
                image_filename TEXT,
                created_at TEXT NOT NULL
            )
        """)

def asset_json(row):
    item = dict(row)
    item["image_url"] = (
        f"/api/uploads/{item['image_filename']}" if item["image_filename"] else None
    )
    return item

@app.get("/api/health")
def health():
    return jsonify({"status": "ok"})

@app.get("/api/assets")
def list_assets():
    q = request.args.get("q", "").strip()
    with get_db() as db:
        if q:
            rows = db.execute(
                "SELECT * FROM assets WHERE asset_id LIKE ? ORDER BY id DESC",
                (f"%{q}%",)
            ).fetchall()
        else:
            rows = db.execute("SELECT * FROM assets ORDER BY id DESC").fetchall()
    return jsonify([asset_json(row) for row in rows])

@app.post("/api/assets")
def create_asset():
    asset_id = request.form.get("asset_id", "").strip()
    category = request.form.get("category", "").strip()
    image = request.files.get("photo")

    if not asset_id or not category:
        return jsonify({"error": "Asset ID and category are required."}), 400
    if len(asset_id) > 100 or len(category) > 100:
        return jsonify({"error": "Asset ID and category must be 100 characters or fewer."}), 400

    filename = None
    if image and image.filename:
        original = secure_filename(image.filename)
        extension = original.rsplit(".", 1)[-1].lower() if "." in original else ""
        if extension not in ALLOWED_EXTENSIONS:
            return jsonify({"error": "Upload a PNG, JPG, JPEG, WEBP, or GIF image."}), 400
        filename = f"{uuid.uuid4().hex}.{extension}"
        image.save(UPLOAD_DIR / filename)

    created_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    try:
        with get_db() as db:
            cursor = db.execute(
                "INSERT INTO assets (asset_id, category, image_filename, created_at) VALUES (?, ?, ?, ?)",
                (asset_id, category, filename, created_at)
            )
            row = db.execute("SELECT * FROM assets WHERE id = ?", (cursor.lastrowid,)).fetchone()
    except sqlite3.IntegrityError:
        if filename:
            (UPLOAD_DIR / filename).unlink(missing_ok=True)
        return jsonify({"error": "That Asset ID already exists."}), 409

    return jsonify(asset_json(row)), 201

@app.get("/api/assets/<int:record_id>")
def get_asset(record_id):
    with get_db() as db:
        row = db.execute("SELECT * FROM assets WHERE id = ?", (record_id,)).fetchone()
    if not row:
        return jsonify({"error": "Asset not found."}), 404
    return jsonify(asset_json(row))

@app.get("/api/uploads/<path:filename>")
def uploaded_file(filename):
    return send_from_directory(UPLOAD_DIR, filename)

@app.errorhandler(413)
def too_large(_error):
    return jsonify({"error": "Image is too large. Maximum size is 8 MB."}), 413

if __name__ == "__main__":
    init_db()
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "5000"))
    print(f"Warehouse API listening on http://{host}:{port}")
    app.run(host=host, port=port, debug=False)
