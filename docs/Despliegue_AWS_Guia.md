# Guía de Despliegue en AWS (24/7)

Para mantener la aplicación (PinGuard / SDN Dashboard) corriendo de manera ininterrumpida (24/7), segura y escalable, la arquitectura recomendada en AWS es utilizar una instancia **EC2** para el backend y frontend, y si se requiere almacenar logs, utilizar **RDS**.

## 1. Arquitecturs
*   **Amazon EC2 (Elastic Compute Cloud):** Alojaremos tanto el servidor Flask (Backend) como los archivos estáticos del Frontend usando NGINX.
*   **Grupos de Seguridad (Security Groups):** 
    *   **Puerto 80/443 (HTTP/HTTPS):** Abiertos a todo el mundo (o restringidos a tu IP corporativa) para acceder al dashboard.
    *   **Puerto 161 (UDP):** Abierto hacia la IP/DNS del Fortinet (`sdnduoc.fortiddns.com` o `192.168.1.7`) para permitir la comunicación SNMP.
    *   **Puerto 22 (SSH):** Abierto sólo hacia tu IP pública para administración.

---

## 2. Pasos para levantar el servidor 24/7 en EC2

### Paso A: Lanzar la instancia EC2
1. Ve a la consola de AWS y dirígete a **EC2**.
2. Haz clic en **Launch Instance** (Lanzar Instancia).
3. **OS:** Selecciona "Ubuntu Server 24.04 LTS" (es muy estándar y fácil de manejar).
4. **Instancia:** `t2.micro` o `t3.micro` (Suficiente para empezar e incluye la capa gratuita).
5. **Key Pair:** Crea y descarga un "Key Pair" para conectarte por SSH.
6. **Red:** Edita los _Security Groups_ para permitir tráfico HTTP y HTTPS desde cualquier lugar, además de SSH desde tu IP.

### Paso B: Conectarse y Configurar el Entorno
Conéctate por SSH a la instancia:
```bash
ssh -i "tu-llave.pem" ubuntu@IP_PUBLICA_EC2
```

Actualiza los paquetes e instala dependencias:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install python3-pip python3-venv nginx -y
```

### Paso C: Clonar o Subir el Código
Sube la carpeta `SDN` a la instancia EC2 (puedes usar Git o SCP/SFTP).

### Paso D: Configurar el Backend (Python Flask) como Servicio 24/7
Para que Flask no se caiga al cerrar la terminal y soporte tráfico real, utilizaremos `Gunicorn` y `systemd`.

1. **Crear Entorno Virtual:**
   ```bash
   cd ~/SDN/backend
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   pip install gunicorn
   ```

2. **Crear el servicio de Systemd:**
   Ejecuta: `sudo nano /etc/systemd/system/pinguard-backend.service`
   Y agrega lo siguiente:
   ```ini
   [Unit]
   Description=Gunicorn instance to serve PinGuard Backend
   After=network.target

   [Service]
   User=ubuntu
   Group=www-data
   WorkingDirectory=/home/ubuntu/SDN/backend
   Environment="PATH=/home/ubuntu/SDN/backend/venv/bin"
   ExecStart=/home/ubuntu/SDN/backend/venv/bin/gunicorn --workers 3 --bind 127.0.0.1:5000 app:app

   [Install]
   WantedBy=multi-user.target
   ```

3. **Iniciar el Backend:**
   ```bash
   sudo systemctl start pinguard-backend
   sudo systemctl enable pinguard-backend
   ```
   *Esto asegurará que Flask siga corriendo en segundo plano 24/7 y se reinicie automáticamente si el servidor se reinicia.*

### Paso E: Configurar el Frontend con NGINX
NGINX servirá los archivos HTML/CSS/JS y enviará las peticiones `/api` al backend.

1. Abre la configuración de NGINX:
   `sudo nano /etc/nginx/sites-available/pinguard`

2. Pega esta configuración:
   ```nginx
   server {
       listen 80;
       server_name TU_IP_PUBLICA_EC2 o_tu_dominio.com;

       # Servir el Frontend
       location / {
           root /home/ubuntu/SDN/frontend;
           index index.html;
           try_files $uri $uri/ /index.html;
       }

       # Redirigir la API al backend (Flask)
       location /api/ {
           proxy_pass http://127.0.0.1:5000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

3. Habilita el sitio y reinicia NGINX:
   ```bash
   sudo ln -s /etc/nginx/sites-available/pinguard /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

---

## 3. Integración con Fortinet (SNMP) desde AWS

Una vez que el servidor esté en la nube, debes asegurarte de que el Fortinet (`sdnduoc.fortiddns.com` o `192.168.1.7`) acepte peticiones SNMP desde la **IP Pública de tu servidor EC2 (54.204.211.76)**.

*   En el Fortigate, ve a **Network > Interfaces**, edita la interfaz que tiene esa IP (probablemente wan1) y asegúrate de que **SNMP** esté habilitado en el acceso administrativo.
*   En **System > SNMP**, habilita el Agente SNMP, crea un **SNMP v2c Community** (Ej: `public` o uno personalizado), y agrega la **IP del servidor EC2** como "Hosts" permitidos para esa community. Sino, rechazará silenciosamente las conexiones.
