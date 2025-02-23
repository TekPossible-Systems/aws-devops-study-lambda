#!/bin/bash
dnf install -y python3-pip httpd mod_ssl git
pip3 install requests boto3 Flask
cd /root
git clone git@github.com:TekPossible-Systems/aws-devops-study-lambda.git
cd aws-devops-study-lambda/server
cp *.py /root
cp ssl.conf /etc/httpd/conf.d/
systemctl restart httpd
cd /root
systemd-run --unit=aws-cluster-project.service /usr/bin/python3 /root/service.py
systemd-run --unit=aws-cluster-webapi.service /usr/bin/python3 /root/webserver.py