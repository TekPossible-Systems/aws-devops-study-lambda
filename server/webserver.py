import os
import time
import json
from flask import Flask

app = Flask(__name__)

def get_ip_of_host():
    ip_addr = os.popen("hostname -i").read().strip()
    return(ip_addr)
@app.route("/health")
def get_health():
    aws_cluster_service_status = os.popen("systemctl is-active aws-cluster-project.service").read()
    if "failed" in aws_cluster_service_status:
        status="UNHEALTHY"
    elif "inactive" in aws_cluster_service_status:
        status="STOPPED"
    elif "active" in aws_cluster_service_status:
        with open("/root/aws_host_status.txt", "r") as status_file:
            status = status_file.readline().strip()
    
    return("{\"HOST\": \"" + get_ip_of_host() + "\", \"HEALTH\": \""  + status + "\"}")

@app.route("/actions/start")
def start_service():
    print("SERVICE START REQUESTED")
    os.system("systemd-run --unit=aws-cluster-project.service /bin/python3 /root/service.py")
    return("{\"HOST\": \"" + get_ip_of_host() + "\", \"ACTION_STATE\":\"EXECUTED_START\"}")

@app.route("/actions/stop")
def stop_service():
    print("SERVICE STOP REQUESTED")
    os.system("systemctl stop aws-cluster-project.service; systemctl reset-failed")
    return("{\"HOST\": \"" + get_ip_of_host() + "\", \"ACTION_STATE\":\"EXECUTED_STOP\"}")


@app.route("/actions/restart")
def restart_service():
    print("SERVICE RESTART REQUESTED")
    os.system("systemctl reset-failed; systemctl restart aws-cluster-project.service;")
    return("{\"HOST\": \"" + get_ip_of_host() + "\", \"ACTION_STATE\":\"EXECUTED_RESTART\"}")

app.run()