from flask import Flask, request, jsonify, make_response
import mysql.connector
import jwt
import datetime
from functools import wraps
from flask_cors import CORS # Import CORS
import functions
import json
import jsonify 

app = Flask(__name__)
CORS(app) # Enable CORS for the entire app

# Secret key for JWT signing. In production, this should be stored securely, e.g., environment variables.
SECRET_KEY = '54fg98h4f@fdjkihiksdDA' # Change this to a strong, secret key!

# Configure your MySQL database connection here
db_config = {
    'user': 'root',
    'password': '',
    'host': 'localhost',
    'database': 'deepmapresearch'
}

def get_db_connection():
    return mysql.connector.connect(**db_config)

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')

        if not token:
            return jsonify({'error': 'Token is missing!'}), 401

        try:
            token = token.split(" ")[1] # Bearer <token>
            data = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            current_user_id = data['user_id']
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired!'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Token is invalid!'}), 401
        except Exception as e:
            return jsonify({'error': 'Something went wrong with token verification'}), 500


        return f(current_user_id, *args, **kwargs) # Pass user_id to the decorated function

    return decorated


@app.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")


    if not username or not password:
        return jsonify({"error": "Username and password required."}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Check if the username already exists
        cursor.execute("SELECT id FROM users WHERE username = %s", (username,))
        if cursor.fetchone():
            return jsonify({"error": "Username already exists."}), 400

        # Insert new user (In a real application, store a hashed password)
        cursor.execute("INSERT INTO users (username, password) VALUES (%s, %s)", (username, password))
        conn.commit()
        return jsonify({"message": "User registered successfully."}), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"error": "Username and password required."}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT id, password FROM users WHERE username = %s", (username,))
        user = cursor.fetchone()

        if user and user["password"] == password:
            # Generate JWT token
            token_payload = {
                'user_id': user['id'],
                'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=1) # Token expiration time
            }
            token = jwt.encode(token_payload, SECRET_KEY, algorithm="HS256")
            # Create a response object using make_response
            resp = make_response(jsonify({"message": "Login successful.", "token": token}))
            # Set the cookie, httponly=True for security (JS cannot access it)
            resp.set_cookie('authToken', token, httponly=True)
            return resp # Return the response object
        else:
            return jsonify({"error": "Invalid credentials."}), 401

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route("/get_map", methods=["GET"])
#@token_required # Apply the token_required decorator
def get_map(): # token_required decorator will pass user_id here
    map_id = request.args.get("id")

    if not map_id:
        return jsonify({"error": "Map id required."}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        # Retrieve the map data for the given map id and current user.
        cursor.execute("SELECT map_data FROM maps WHERE id = " + map_id) # Use current_user_id from token
        result = cursor.fetchone()
        if result:
            return jsonify(result), 200
        else:
            return jsonify({"error": "Map not found or not authorized."}), 404 # Changed error message for security

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()
#  ***************************************************************
@app.route("/generate_tree", methods=["GET","POST"])
def generate_tree():
    try:
        data = request.get_json()
        prompt = data.get("prompt")
        max_br = data.get("max_br", 3)  # Default to 3 branches if not provided

        if not prompt:
            return jsonify({"error": "Prompt is required"}), 400

        # Generate level one tree
        tree = functions.generate_level_one_tree(prompt, max_br)
        tree_json = json.dumps(tree)

        # Store in database
        cur = mysql.connection.cursor()
        cur.execute("INSERT INTO maps (map_data) VALUES (%s)", (tree_json,))
        tree_id = cur.lastrowid 
        mysql.connection.commit()
        cur.close()

        return {tree_id:tree_json}, 201  
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ***********************************************************************








if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=True)