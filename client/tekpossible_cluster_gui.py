import boto3
import tkinter as tk
from tkinter import messagebox, BOTH, ttk
import threading
import requests
import json
import time

# GLOBALS
__STOPPED="#888"
__UNHEALTHY = "#f00"
__HEALTHY = "#0f0"
__parameter_name = "api-gw-url"

# GET API ENDPOINT FROM AWS
ssm_client = boto3.client('ssm')
parameter_server_list = ssm_client.get_parameter(
    Name=__parameter_name
);

__API_GW_SSM_PARAMETER = str(parameter_server_list["Parameter"]["Value"])
# EXAMPLE CLUSTER HEALTH RETURN
# cluster_health = [
#     {"HOST": "1.1.1.1", "HEALTH": "STOPPED"},
#     {"HOST": "1.1.1.2", "HEALTH": "HEALTHY"},  
#     {"HOST": "1.1.1.3", "HEALTH": "UNHEALTHY"},      
#     {"HOST": "1.1.1.4", "HEALTH": "UNHEALTHY"}
# ]


def start_service():
    msg = messagebox.showinfo("Service Start", "Start of Service Executed")
    print("REQUEST FOR CLUSTER START - RESULT:" + requests.get(__API_GW_SSM_PARAMETER + "?action=start").text)

def stop_service():
    msg = messagebox.showinfo("Service Stop", "Stop of Service Executed")
    print("REQUEST FOR CLUSTER STOP - RESULT:" + requests.get(__API_GW_SSM_PARAMETER + "?action=stop").text)

def restart_service():
    msg = messagebox.showinfo("Service Restart", "Restart of Service Executed")
    print("REQUEST FOR CLUSTER RESTART - RESULT:" + requests.get(__API_GW_SSM_PARAMETER + "?action=restart").text)

def status_gui():
        while True:
            top = tk.Toplevel()
            top.title("TERKPOSSIBLE STATUS GUI")
            canvas = tk.Canvas(top)
            canvas.delete("all")
            x_max_size = 1400
            x_location_1 = 20
            y_location_1 = 20
            x_location_2 = 170
            y_location_2 = 170
            rows = 1 
            cluster_health_response = requests.get(__API_GW_SSM_PARAMETER + "?action=health").text
            cluster_health = json.loads(cluster_health_response)
            print("HEALTH: " + cluster_health)
            for node in cluster_health:
                if x_location_1 + 150 > x_max_size:
                    x_location_1 =  20
                    x_location_2 =  170
                    y_location_1 += 180
                    y_location_2 += 180
                    rows += 1
                if node['HEALTH'] == "HEALTHY":
                    canvas.create_rectangle(x_location_1, y_location_1, x_location_2, y_location_2, outline=__HEALTHY, fill=__HEALTHY) 
                    canvas.create_text((x_location_1 + x_location_2)/2, (y_location_1 + y_location_2)/2, text=node['HOST'], fill='black')              
                    x_location_1 += 180
                    x_location_2 += 180
                elif node['HEALTH'] == "UNHEALTHY":
                    canvas.create_rectangle(x_location_1, y_location_1, x_location_2, y_location_2, outline=__UNHEALTHY, fill=__UNHEALTHY)   
                    canvas.create_text((x_location_1 + x_location_2)/2, (y_location_1 + y_location_2)/2, text=node['HOST'], fill='black')              
                    x_location_1 += 180
                    x_location_2 += 180
                elif node['HEALTH'] == "STOPPED":
                    canvas.create_rectangle(x_location_1, y_location_1, x_location_2, y_location_2, outline=__STOPPED, fill=__STOPPED)   
                    canvas.create_text((x_location_1 + x_location_2)/2, (y_location_1 + y_location_2)/2, text=node['HOST'], fill='black')              
                    x_location_1 += 180
                    x_location_2 += 180
            canvas.pack(fill=BOTH, expand=1)
            top.geometry(str(x_max_size) + "x" + str(rows*180))
            top.mainloop()
            time.sleep(10)
            top.quit()

window = tk.Tk()

window.title("TEKPOSSIBLE ACTION GUI")
window.geometry("420x80")

button_start = tk.Button(window, text="Start Service", command=start_service)
button_start.place(x=20, y=20)

button_stop = tk.Button(window, text="Stop Service", command=stop_service)
button_stop.place(x=150, y=20)

button_stop = tk.Button(window, text="Restart Service", command=restart_service)
button_stop.place(x=280, y=20)

status_gui = threading.Thread(target=status_gui())
status_gui.run()

