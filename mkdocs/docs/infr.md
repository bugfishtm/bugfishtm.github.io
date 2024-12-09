# Infrastructure
We use an internal infrastructure to test our projects on.

---

### hive.hv-inf.de
Hypervisor to host Shadow, Thunder and Sunrise KVM.

- Hypervisor
- AMD Ryzen 7 1700X
- 2x SSD SATA 512 GB
- 4x RAM 16384 MB DDR4
- IPv4: 144.76.119.80
- IPv6: 2a01:4f8:192:7442::2

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
 - IPv4: 148.251.169.98
 - IPv6: 2a01:4f8:192:7442::3

| Service | Technology | Details | URL |
|----|----|----|----|
|Administration| Webmin | Server Manager Interface for Hosting Users | [Visit](https://thunder.hv-inf.de:10000) | 
|Webmail| Usermin | Webmail Interface for Hosting Users | [Visit](https://thunder.hv-inf.de:20000) | 
|Cloud| Nextcloud | Cloud Interface for Hosting Users | [Visit](https://files.bugfish.eu) | 
|Bugfish Website| Suitefish | Website for Bugfish.eu | [Visit](https://bugfish.eu) | 
|Suitefish Website | Suitefish | Website for Suitefish.com | [Visit](https://suitefish.com) | 

**Email - Login Information**  

**IMAP/SMTP Hostname:** mail.bugfish.eu   
**IMAP/SMTP Username:** Your Full E-Mail Address   
**IMAP/SMTP Password:** Your E-Mail Password  
**IMAP Port:** 993   
**SMTP Port:** 587   
**IMAP Port:** SSL   
**SMTP Method:** STARTLS   
**IMAP/SMTP Auth:** Normal Password  

---

### shadow.hv-inf.de
Backup Server for primary services hosted on thunder.

- Secondary DNS Server
- IPv4: 144.76.119.77
- IPv6: 2a01:4f8:192:7442::4

| Service | Technology | Details | URL |
|----|----|----|----|
|Administration| Webmin | Server Manager Interface | [Visit](https://shadow.hv-inf.de:10000) | 

---

### sunrise.hv-inf.de
Just an internal testing server.

 - IPv4: 144.76.119.2
 - IPv6: 2a01:4f8:192:7442::5
 - Testing Dummy Server