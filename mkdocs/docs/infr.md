# Infrastructure
We use an internal infrastructure to test our projects on.

---

### hive.hv-inf.de
Hypervisor to host Shadow, Thunder and Sunrise KVM.

| Hardware | Details |
|----|----|
|Physical CPU| AMD Ryzen 7 1700X |
|Available RAM| 4x 16384 MB DDR4 |
|SDD Storage| 2x SSD SATA 512 GB |

| IP | Reverse/Hostname |
|----|----|
|144.76.119.80| hive.hv-inf.de |
|2a01:4f8:192:7442::2| hive.hv-inf.de |

| Service | Technology | Details | URL |
|----|----|----|----|
|Administration| Webmin | Server Manager Interface | [Visit](https://hive.hv-inf.de:10000) | 
|KVM Manager| Proxmox | Hypervisor Manager | [Visit](https://hive.hv-inf.de:8006) |

---

### thunder.hv-inf.de
Primary hosting server for all kind of services and websites.

 - Hosting & Mail Server
 - Primary DNS Server
 - VPN Server

| IP | Reverse/Hostname |
|----|----|
|148.251.169.98| thunder.hv-inf.de |
|2a01:4f8:192:7442::3| thunder.hv-inf.de |

| Email-Setup |  |
|----|----|
|IMAP/SMTP Hostname| thunder.hv-inf.de |
|IMAP/SMTP Username| Your Full E-Mail Address |
|IMAP/SMTP Password| Your E-Mail Password |
|IMAP Port/Method| 993/SSL |
|SMTP Port/Method| 587/STARTLS |
|Authentication Type| Normal Password |


| Service | Technology | Details | URL |
|----|----|----|----|
|Administration| Webmin | Server Manager Interface for Hosting Users | [Visit](https://thunder.hv-inf.de:10000) | 
|Webmail| Usermin | Webmail Interface for Hosting Users | [Visit](https://thunder.hv-inf.de:20000) | 
|Cloud| Nextcloud | Cloud Interface for Hosting Users | [Visit](https://files.bugfish.eu) | 
|Bugfish Website| Suitefish | Website for Bugfish.eu | [Visit](https://bugfish.eu) | 
|Suitefish Website | Suitefish | Website for Suitefish.com | [Visit](https://suitefish.com) | 
|DNS Server| DNSHTTP | DNS Manager | [Visit](https://hv-inf.de/dnshttp) | 
|VPN Server| Softether | VPN Manager | [Visit](https://hv-inf.de:5555) | 

---

### shadow.hv-inf.de
Backup Server for primary services hosted on thunder.

| IP | Reverse/Hostname |
|----|----|
|144.76.119.77| shadow.hv-inf.de |
|2a01:4f8:192:7442::4| shadow.hv-inf.de |

| Service | Technology | Details | URL |
|----|----|----|----|
|Administration| Webmin | Server Manager | [Visit](https://shadow.hv-inf.de:10000) | 
|Secondary DNS Server| DNSHTTP | DNS Manager | [Visit](https://shadow.hv-inf.de/dnshttp) | 
|Secondary Mail Server| MROD | Mail Relay Manager | [Visit](https://shadow.hv-inf.de/mrod) | 


---

### sunrise.hv-inf.de
Just an internal testing server.

| IP | Reverse/Hostname |
|----|----|
|144.76.119.2| sunrise.hv-inf.de |
|2a01:4f8:192:7442::5| sunrise.hv-inf.de |
