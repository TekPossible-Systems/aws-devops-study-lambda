import boto3
import json
import os
import time

__parameter_name = "cluster-host-list"
ssm_client = boto3.client('ssm')

parameter_server_list = ssm_client.get_parameter(
    Name=__parameter_name
)
server_list = json.loads(parameter_server_list["Parameter"]["Value"])

server_list.append(os.popen('hostname -i').read().strip())

update_param_response = ssm_client.put_parameter(
    Name=__parameter_name,
    Value=json.dumps(server_list),
    Overwrite=True,
    Type="String"
)

while True:
    print("Service is running!")
    time.sleep(30)
    with open("/root/aws_host_status.txt", "w+") as status_file:
        status_file.write("HEALTHY")