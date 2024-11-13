# Infrastructure
We use an internal infrastructure to test our projects on.

---

### hive.hv-inf.de
Hypervisor to host Shadow, Thunder and Sunrise KVM.

| Service | Technology | Details | URL |
|----|----|----|----|
|Administration| Webmin | Server Manager Interface | [Visit](https://hive.hv-inf.de:10000) | 
|KVM Manager| Proxmox | Hypervisor Manager | [Visit](https://hive.hv-inf.de:8006) |

---

### thunder.hv-inf.de
Primary hosting server for all kind of services and websites.

| Service | Technology | Details | URL |
|----|----|----|----|
|Administration| Webmin | Server Manager Interface | [Visit](https://thunder.hv-inf.de:10000) | 
|DNS Server| DNSHTTP / Bind9 | Secondary DNS Server| [Visit](https://hv-inf.de/dnshttp) |

Useable services on this server "thunder" are explained at the upper section "Services".

---

### shadow.hv-inf.de
Backup Server for primary services hosted on thunder.

| Service | Technology | Details | URL |
|----|----|----|----|
|Administration| Webmin | Server Manager Interface | [Visit](https://shadow.hv-inf.de:10000) | 
|DNS Server| DNSHTTP / Bind9 | Secondary DNS Server| [Visit](https://shadow.hv-inf.de/dnshttp) |
|Mail Backup Relay| MROD / Postfix | Secondary Incoming Backup Relay| [Visit](https://shadow.hv-inf.de/mrod) | 

---

### sunrise.hv-inf.de
Just an internal testing server.