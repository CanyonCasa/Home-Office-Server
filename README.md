# Home Office Server

*Keywords:	Raspberry Pi, RPi, small business, office, server, network, Kerberos login, domain, DNS server, DHCP server, Samba server, Active Directory, file and printer sharing, Linux, Raspian, open source.

## Building a Raspberry Pi Office Network Server
**_By Dave Campbell_**

![server](https://github.com/CanyonCasa/Home-Office-Server/blob/master/server.jpg)

Figure 1: Raspberry Pi Server Hardware

### Abstract
This document provides step-by-step details for setting up a Raspberry Pi (RPi) to perform the basic services of managing a small office or home network using Raspian Linux and open source tool packages. It includes everything needed to support a basic Active Directory domain controller, including time services, dynamic IP, DNS and DHCP network services, file and printer sharing, Kerberos login, backup, and automation of operational tasks. 
Total cost of full feature (headless) hardware, including a 1.2GHz Quad-core Raspberry Pi 3 with 1G RAM, 16G SD Card, case, power adapter, 64G USB flash drive, USB SD Card adapter and second 16G SD Card, runs around $100. Total software cost and licensing is $0. 
Setup time following these instructions runs around 2-3 days. After creating a baseline image file, it only requires a matter of a few minutes to rebuild the server. Existing servers have demonstrated uptime and reliability equal to or better than Windows based servers.
