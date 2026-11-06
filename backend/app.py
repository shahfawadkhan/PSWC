"""Start the backend:  python app.py"""
from flask import Flask, jsonify
from werkzeug.exceptions import HTTPException

from pswc.config import MAX_UPLOAD_BYTES
from pswc.routes import bp

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = MAX_UPLOAD_BYTES
try:                                   # needed when the web page is hosted on another address
    from flask_cors import CORS
    CORS(app)
except ImportError:
    pass
app.register_blueprint(bp)


@app.errorhandler(Exception)
def fail(e):
    if isinstance(e, HTTPException):
        return e
    return jsonify(error=str(e)), 400


if __name__ == "__main__":
    app.run(port=5000, debug=False)
