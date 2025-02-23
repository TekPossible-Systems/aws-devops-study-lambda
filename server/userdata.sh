#!/bin/bash
cp *.py /root
mv ssl.conf /etc/httpd/conf.d/
systemctl restart httpd
cd /root
firewall-cmd -add-port=443/tcp --permanent
firewall-cmd --add-port=80/tcp --permanent
firewall-cmd --reload
systemd-run --unit=aws-cluster-project.service /usr/bin/python3 /root/service.py
systemd-run --unit=aws-cluster-webapi.service /usr/bin/python3 /root/webserver.py