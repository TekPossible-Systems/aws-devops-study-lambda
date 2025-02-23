import boto3
import requests
import json

# SSM Parameter for hosts:
__parameter_name = "cluster-host-list"

def cluster_link_init():
    ssm_client = boto3.client('ssm')
    parameter_server_list = ssm_client.get_parameter(
        Name=__parameter_name
    )
    server_list = json.loads(parameter_server_list["Parameter"]["Value"])
    server_list.remove("0.0.0.0")
    return(server_list)

def cluster_health(hosts):
    responses = []
    for host in hosts:
        host_data = requests.get("https://" + host + "/health", verify=False)
        print(host_data)
        responses.append(host_data.text)
    return(responses)

def cluster_start(hosts):
    responses = []
    for host in hosts:
        host_data = requests.get("https://" + host + "/actions/start", verify=False)
        responses.append(host_data.text)
    return(responses)

def cluster_stop(hosts):
    responses = []
    for host in hosts:
        host_data = requests.get("https://" + host + "/actions/stop", verify=False)
        responses.append(host_data.text)
    return(responses)

def cluster_restart(hosts):
    responses = []
    for host in hosts:
        host_data = requests.get("https://" + host + "/actions/restart", verify=False)
        responses.append(host_data.text)
    return(responses)

def lambda_handler(event, context):
    cluster_hosts = cluster_link_init()
    try: 
        query_params = event['queryStringParameters']
        print(query_params)
        if query_params['action'] == 'health':
            print("Starting health check on cluster")
            return(cluster_health(cluster_hosts))
        elif query_params['action'] =='start':
            print("Starting services in cluster")
            return(cluster_start(cluster_hosts))
        elif query_params['action'] =='stop':
            print("Starting services in cluster")
            return(cluster_stop(cluster_hosts))
        elif query_params['action'] =='restart':
            print("Starting services in cluster")
            return(cluster_restart(cluster_hosts))
        else:
            return("{SMUG_PUG_IS_ON_A_RUG}")
    except Exception as e: 
        print("Exception: " + str(e))
        return("{SERVER_SIDE_ERROR}")