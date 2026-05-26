from pysnmp.hlapi import *
import time
import random
from config import Config

# Fortinet Enterprise MIB Prefix: 1.3.6.1.4.1.12356
# System CPU/Mem OIDs (Fortigate MIB):
OID_SYS_CPU = '1.3.6.1.4.1.12356.101.4.1.3.0' # fgSysCpuUsage
OID_SYS_MEM = '1.3.6.1.4.1.12356.101.4.1.4.0' # fgSysMemUsage
OID_SYS_SESSIONS = '1.3.6.1.4.1.12356.101.4.1.8.0' # fgSysSesCount

# MIB-II Standard OIDs for Interfaces
OID_IF_NUMBER = '1.3.6.1.2.1.2.1.0'
OID_IF_DESCR = '1.3.6.1.2.1.2.2.1.2'   # ifDescr
OID_IF_OPER_STATUS = '1.3.6.1.2.1.2.2.1.8' # ifOperStatus
OID_IF_IN_OCTETS = '1.3.6.1.2.1.2.2.1.10'  # ifInOctets
OID_IF_OUT_OCTETS = '1.3.6.1.2.1.2.2.1.16' # ifOutOctets

class SNMPMonitor:
    def __init__(self, ip, community, port, version):
        self.ip = ip
        self.community = community
        self.port = port
        self.version = version

    def _get(self, oid):
        iterator = getCmd(
            SnmpEngine(),
            CommunityData(self.community, mpModel=self.version),
            UdpTransportTarget((self.ip, self.port), timeout=1.5, retries=1),
            ContextData(),
            ObjectType(ObjectIdentity(oid))
        )
        
        errorIndication, errorStatus, errorIndex, varBinds = next(iterator)
        
        if errorIndication or errorStatus:
            return None
            
        for varBind in varBinds:
            # varBind is a tuple: (oid, value)
            val = varBind[1]
            try:
                return int(val)
            except:
                return str(val)
        return None

    def _walk(self, base_oid):
        results = {}
        iterator = nextCmd(
            SnmpEngine(),
            CommunityData(self.community, mpModel=self.version),
            UdpTransportTarget((self.ip, self.port), timeout=1.5, retries=1),
            ContextData(),
            ObjectType(ObjectIdentity(base_oid)),
            lexicographicMode=False
        )
        
        for errorIndication, errorStatus, errorIndex, varBinds in iterator:
            if errorIndication or errorStatus:
                break
            for varBind in varBinds:
                # sub-index is the end of the oid
                oid_str = str(varBind[0])
                idx = oid_str.split('.')[-1]
                val = varBind[1]
                try:
                    val = int(val)
                except:
                    val = str(val)
                results[idx] = val
                
        return results

    def get_system_stats(self):
        cpu = self._get(OID_SYS_CPU)
        mem = self._get(OID_SYS_MEM)
        sessions = self._get(OID_SYS_SESSIONS)
        
        if cpu is None:
            raise Exception("No se pudo obtener la información desde el FortiGate por SNMP (Dispositivo inalcanzable).")
            
        return {
            "cpu": cpu,
            "memory": mem,
            "sessions": sessions,
            "uptime": 0,
            "firmware": "FortiOS",
            "hostname": "FortiGate"
        }

    def get_interfaces(self):
        names = self._walk(OID_IF_DESCR)
        statuses = self._walk(OID_IF_OPER_STATUS) # 1 = up, 2 = down
        
        if not names:
            raise Exception("No se pudieron obtener las interfaces desde el FortiGate por SNMP.")
            
        interfaces = []
        for idx, name_bytes in names.items():
            name = str(name_bytes)
            status_val = statuses.get(idx, 2)
            status = 'up' if status_val == 1 else 'down'
            
            interfaces.append({
                "name": name,
                "alias": 'Puerto de red',
                "status": status,
                "type": 'physical'
            })
            
        return interfaces

    def get_traffic_summary(self):
        # En caso de no poder conectar, lanzar excepción en lugar de simular
        cpu = self._get(OID_SYS_CPU)
        if cpu is None:
            raise Exception("Dispositivo inalcanzable para medir tráfico.")
        return {
            "rx": 0,
            "tx": 0
        }

# Create a singleton instance
snmp_service = SNMPMonitor(Config.FORTINET_IP, Config.SNMP_COMMUNITY, Config.SNMP_PORT, Config.SNMP_VERSION)
