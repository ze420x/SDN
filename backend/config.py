import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Flask settings
    PORT = int(os.environ.get('FLASK_PORT', 5000))
    DEBUG = os.environ.get('FLASK_DEBUG', 'True') == 'True'
    
    # Fortinet SNMP Settings
    # Puede ser la IP interna si hay VPN (192.168.1.7) o el DNS público proporcionado
    FORTINET_IP = os.environ.get('FORTINET_IP', 'sdnduoc.fortiddns.com')
    SNMP_PORT = int(os.environ.get('SNMP_PORT', 161))
    SNMP_COMMUNITY = os.environ.get('SNMP_COMMUNITY', 'public') # Can be changed via .env
    SNMP_VERSION = 1 # 1 = v2c in pysnmp (0 = v1, 1 = v2c, 3 = v3)
