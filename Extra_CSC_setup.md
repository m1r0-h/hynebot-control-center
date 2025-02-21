# How to make a server into CSC for Hynebot Control Center

This guide is made for JHC to make it easier to deploy the project. In this guide, a server is created on the CSC cPouta platform that can be used for Hynebot Control Center (Server Part).

## New project

### Go and login to https://my.csc.fi/welcome. Make new project:

_Projects -> New Project_

### Activate cPouta for the new project:

_Services -> Add Service_

### Go to cPouta service https://pouta.csc.fi/. Note that it may take a while for cPouta to activate.

## cPouta part

Note that you don't have to do everything like this, but here is an example of how the server was able to be made for Hynebot Control Center.

### Create Key Pair (For SSH):

_Compute -> Key Pairs -> Create Key Pair_

### Create Volume:

Volumes -> Volumes -> Create Volume

Example:

- Name: Name it however you want.
- Description: Describe how you want
- Volume Source: Image
- Use image as a source: Ubuntu
- Size: Add more space (like 50GiB)
- Type: standard
- Availability Zone: nova
- Group: No group

### Create Secure Group:

_Network -> Secure Groups -> Create Secure Group_
Example rules (SSH and 4 ports for servers):

Rule 1:

- Rule: Custom TCP Rule
- Description: ...
- Direction: Ingress
- Open Port: Port Range
- From Port: 8080
- To Port: 8083
- Remote: CIDR
- CIDR: 0.0.0.0/0

Rule 3:

- Rule: Custom TCP Rule
- Description: ...
- Direction: Egress
- Open Port: Port Range
- From Port: 8080
- To Port: 8083
- Remote: CIDR
- CIDR: 0.0.0.0/0

Rule 3:

- Rule: SSH
- Everything else: default

### Create Flouting IP:

_Network -> Flouting IPs -> Allocate IP to Project_

### Create Instance:

_Compute -> Instances -> Launch Instance_

- Availability Zone: nova
- Instance Name: Name it however you want.
- Flavour: standard.small
- Number of Instances: 1
- Instance Voot Source: Boot from volume
- Volume: Your Volume
- Remember to add your custom Key Pair and Secure Group (Second tab)

### Associate Floating IP:

_Compute -> Instances -> Launch Instance -> "Your Instance" -> from the drop-down menu -> Associate Floating IP_

After that reboot instance.

### Connect to server (SSH):

How to set up Key Pair: https://docs.csc.fi/cloud/pouta/launch-vm-from-web-gui/
Connect example:

```bash
ssh -i ./HCC_Key_Pair.pem ubuntu@xxx.xxx.xxx.xxx
```

After that, you might want to do:

- Update
- Users
- UFW
- Fail2Ban
- Backup
- …

Then use the [README.md](/README.md) file to install the project on the server.
