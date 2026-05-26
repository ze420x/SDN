import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
import pymysql

def get_db_connection():
    return pymysql.connect(
        host="database-1.c34ii8wug8wi.us-east-2.rds.amazonaws.com",
        user="admin",
        password="eXSgNhPa1iy3SGCi2Y3V",
        database="pinguard_db",
        cursorclass=pymysql.cursors.DictCursor
    )

from flask import Flask, jsonify, request
from flask_cors import CORS
from config import Config
from services.snmp_monitor import snmp_service
import time

app = Flask(__name__)
# Enable CORS for the frontend to access
CORS(app)

# Dummy traffic data store for graph
traffic_history = []

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "ok", "message": "PinGuard Backend Running"}), 200

@app.route('/api/dashboard/stats', methods=['GET'])
def get_dashboard_stats():
    try:
        stats = snmp_service.get_system_stats()
        interfaces = snmp_service.get_interfaces()
        
        # Calculate interfaces UP count
        up_count = sum(1 for i in interfaces if i['status'] == 'up')
        
        stats['interfaces_up'] = up_count
        stats['interfaces_total'] = len(interfaces)
        
        return jsonify({
            "success": True,
            "data": stats
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

@app.route('/api/dashboard/traffic', methods=['GET'])
def get_traffic():
    try:
        current_traffic = snmp_service.get_traffic_summary()
        
        traffic_history.append({
            "timestamp": int(time.time() * 1000),
            "rx": current_traffic['rx'],
            "tx": current_traffic['tx']
        })
        
        if len(traffic_history) > 24:
            traffic_history.pop(0)
            
        return jsonify({
            "success": True,
            "data": traffic_history
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

@app.route('/api/interfaces', methods=['GET'])
def get_interfaces():
    try:
        interfaces = snmp_service.get_interfaces()
        return jsonify({
            "success": True,
            "data": interfaces
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

@app.route('/api/interfaces/<name>/toggle', methods=['PUT'])
def toggle_interface(name):
    content = request.json
    new_status = content.get('status')
    
    # IMPORTANTE: En el futuro esto debería llamar a la API REST del FortiGate para cambiar el estado.
    # Por ahora sólo devolvemos éxito para la prueba de frontend.
    return jsonify({
        "success": True,
        "data": {
            "name": name,
            "status": new_status,
            "alias": "Puerto de red"
        }
    })

@app.route('/api/logs', methods=['GET'])
def get_logs():
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            # Trae los últimos 50 logs reales guardados en tu base de datos
            cursor.execute("SELECT * FROM fortigate_logs ORDER BY fecha_registro DESC LIMIT 50")
            logs_reales = cursor.fetchall()
        connection.close()
        
        return jsonify({
            "success": True,
            "data": logs_reales,
            "pagination": { "page": 1, "per_page": 10, "total": len(logs_reales), "total_pages": 1 }
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Error al conectar con RDS: {str(e)}",
            "data": []
        }), 500

@app.route('/api/actions/history', methods=['GET'])
def get_actions_history():
    return jsonify({
        "success": True,
        "data": []
    })

# Auth Mock
@app.route('/api/auth/login', methods=['POST'])
def login():
    content = request.json
    username = content.get('username')
    password = content.get('password')
    
    if username == "Forti" and password == "duoc":
        return jsonify({
            "success": True,
            "token": "backend_token_123",
            "user": {"username": "Forti", "role": "Administrador", "name": "Operador PG"}
        })
    return jsonify({"success": False, "message": "Credenciales inválidas"}), 401


if __name__ == '__main__':
    # Initialize some dummy traffic history
    now = int(time.time() * 1000)
    for i in range(24, 0, -1):
        traffic_history.append({
            "timestamp": now - (i * 3600000),
            "rx": 0,
            "tx": 0
        })
        
    app.run(host='0.0.0.0', port=Config.PORT, debug=Config.DEBUG)
