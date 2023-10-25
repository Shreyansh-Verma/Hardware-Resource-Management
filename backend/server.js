const express = require('express')
const os = require('os');
const fs = require('fs');
const { exec } = require('child_process');
const app = express()
const port = 5000

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.get('/system-info', (req, res) => {
    const systemInfo = {
        platform: os.platform(),
        arch: os.arch(),
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        cpus: os.cpus(),
    };

    res.json(systemInfo);
})

app.get('/operating-system-info', (req, res) => {
    const osInfo = {
        type: os.type(),
        hostname: os.hostname(),
        release: os.release(),
    };

    res.json(osInfo);
});

app.get('/kernel-modules', (req, res) => {
    exec('lsmod', (error, stdout, stderr) => {
        if (error) {
            res.status(500).json({ error: 'Failed to retrieve kernel modules' });
            return;
        }
        res.json({ modules: stdout });
    });
});

app.get('/boot-info', (req, res) => {
    exec('dmesg', (error, stdout, stderr) => {
        if (error) {
            res.status(500).json({ error: 'Failed to retrieve boot information' });
            return;
        }
        res.json({ bootInfo: stdout });
    });
});

app.get('/file-systems', (req, res) => {
    exec('df -h', (error, stdout, stderr) => {
        if (error) {
            console.error(error); // Log the error to the console
            res.status(500).json({ error: 'Failed to retrieve file system information' });
            return;
        }

        const fileSystems = stdout
            .split('\n')
            .slice(1) // Skip the header row
            .map((line) => {
                const [device, size, used, available, usePercentage, mountPoint] = line.split(/\s+/);
                return { device, size, used, available, usePercentage, mountPoint };
            });

        res.json({ fileSystems });
    });
});

app.get('/users', (req, res) => {
    fs.readFile('/etc/passwd', 'utf8', (err, data) => {
        if (err) {
            res.status(500).json({ error: 'Failed to retrieve user information' });
            return;
        }

        const users = data
            .split('\n')
            .map((line) => {
                const [username, , uid, gid, fullName, homeDir, shell] = line.split(':');
                return { username, uid, gid, fullName, homeDir, shell };
            });

        res.json({ users });
    });
});

app.get('/groups', (req, res) => {
    fs.readFile('/etc/group', 'utf8', (err, data) => {
        if (err) {
            res.status(500).json({ error: 'Failed to retrieve group information' });
            return;
        }

        const groups = data
            .split('\n')
            .map((line) => {
                const parts = line.split(':');
                if (parts.length >= 4) {
                    const [groupName, , gid, members] = parts;
                    const groupMembers = members.split(',');
                    return { groupName, gid, groupMembers };
                }
                return null; // Skip lines with insufficient data
            })
            .filter(group => group !== null);

        res.json({ groups });
    });
});

app.get('/processors', (req, res) => {
    const cpuInfo = os.cpus();
    res.json({ processors: cpuInfo });
});

app.get('/environment-variables', (req, res) => {
    const environmentVariables = process.env;
    res.json({ environmentVariables });
});

app.get('/memory', (req, res) => {
    const memoryInfo = {
        memFree: {
            field: 'Free Memory',
            description: 'The amount of physical memory (RAM) that is currently free and available for use.',
            value: `${(os.freemem() / 1024 / 1024).toFixed(2)} MB`,
        },
        memAvailable: {
            field: 'Available Memory',
            description: 'The amount of memory that is available for programs to allocate without needing to swap to disk.',
            value: `${(os.totalmem() - os.freemem() / 1024 / 1024).toFixed(2)} MB`,
        },
        buffers: {
            field: 'Buffers',
            description: 'Memory used by the kernel to buffer I/O operations before writing to disk.',
            value: `${(os.totalmem() - os.freemem() - os.totalmem() * (os.freemem() / os.totalmem()) / 1024 / 1024).toFixed(2)} MB`,
        },
        cached: {
            field: 'Cached',
            description: 'Memory used by the system for caching data from disks.',
            value: `${(os.totalmem() * (os.freemem() / os.totalmem()) / 1024 / 1024).toFixed(2)} MB`,
        },
        // Add more memory types as needed
    };

    res.json({ memory: memoryInfo });
});


app.get('/pci-devices', (req, res) => {
    exec('lspci', (error, stdout, stderr) => {
        if (error) {
            res.status(500).json({ error: 'Failed to retrieve PCI device information' });
            return;
        }

        const pciDevices = stdout.split('\n').map((line) => {
            return { description: line.trim() };
        });

        res.json({ pciDevices });
    });
});

app.get('/usb-devices', (req, res) => {
    exec('lsusb', (error, stdout, stderr) => {
        if (error) {
            res.status(500).json({ error: 'Failed to retrieve USB device information' });
            return;
        }

        const usbDevices = stdout.split('\n').map((line) => {
            return { description: line.trim() };
        });

        res.json({ usbDevices });
    });
});

app.get('/printers', (req, res) => {
    exec('lpstat -a', (error, stdout, stderr) => {
        if (error) {
            res.status(500).json({ error: 'Failed to retrieve printer information' });
            return;
        }

        const printers = stdout.split('\n').map((line) => {
            return { name: line.trim() };
        });

        res.json({ printers });
    });
});

app.get('/battery', (req, res) => {
    exec('upower -i /org/freedesktop/UPower/devices/battery_BAT0', (error, stdout, stderr) => {
        if (error) {
            res.status(500).json({ error: 'Failed to retrieve battery information' });
            return;
        }

        // You can parse the 'stdout' as needed to extract specific battery information.
        // Example: Battery status, charge percentage, etc.
        res.json({ battery: stdout });
    });
});

app.get('/sensors', (req, res) => {
    exec('sensors', (error, stdout, stderr) => {
        if (error) {
            res.status(500).json({ error: 'Failed to retrieve sensor information' });
            return;
        }

        // You can parse 'stdout' as needed to extract sensor data.
        // Example: Temperature readings, fan speeds, etc.
        res.json({ sensorData: stdout });
    });
});

app.get('/input-devices', (req, res) => {
    exec('xinput list', (error, stdout, stderr) => {
        if (error) {
            res.status(500).json({ error: 'Failed to retrieve input device information' });
            return;
        }

        const inputDevices = stdout.split('\n').map((line) => {
            return { name: line.trim() };
        });

        res.json({ inputDevices });
    });
});

app.get('/storage-devices', (req, res) => {
    exec('lsblk -d -o NAME,ROTA,MODEL,SIZE,VENDOR', (error, stdout, stderr) => {
        if (error) {
            res.status(500).json({ error: 'Failed to retrieve storage device information' });
            return;
        }

        const storageDevices = stdout
            .split('\n')
            .slice(1)
            .map((line) => {
                const [name, rota, model, size, vendor] = line.split(/\s+/);
                return {
                    name,
                    rota,
                    model,
                    size,
                    vendor,
                };
            });

        res.json({ storageDevices });
    });
});

app.get('/dmi', (req, res) => {
    exec('sudo dmidecode', (error, stdout, stderr) => {
        if (error) {
            res.status(500).json({ error: 'Failed to retrieve DMI information' });
            return;
        }

        res.json({ dmi: stdout });
    });
});

app.get('/network-interfaces', (req, res) => {
    exec('ip -o link show', (error, stdout, stderr) => {
        if (error) {
            res.status(500).json({ error: 'Failed to retrieve network interface information' });
            return;
        }

        const networkInterfaces = stdout
            .split('\n')
            .map((line) => {
                const parts = line.trim().split(':');
                return {
                    name: parts[1],
                    state: parts[2],
                };
            });

        res.json({ networkInterfaces });
    });
});

app.get('/ip-connections', (req, res) => {
    exec('ss -tuln', (error, stdout, stderr) => {
        if (error) {
            res.status(500).json({ error: 'Failed to retrieve IP connection information' });
            return;
        }

        const ipConnections = stdout
            .split('\n')
            .slice(1) // Skip the header
            .map((line) => {
                const [protocol, local, remote] = line.trim().split(/\s+/);
                return {
                    protocol,
                    local,
                    remote,
                };
            });

        res.json({ ipConnections });
    });
});

app.get('/routing-table', (req, res) => {
    exec('ip route', (error, stdout, stderr) => {
        if (error) {
            res.status(500).json({ error: 'Failed to retrieve routing table information' });
            return;
        }

        const routingTable = stdout
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.length > 0);

        res.json({ routingTable });
    });
});

app.get('/arp-table', (req, res) => {
    exec('ip neigh', (error, stdout, stderr) => {
        if (error) {
            res.status(500).json({ error: 'Failed to retrieve ARP table information' });
            return;
        }

        const arpTable = stdout
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.length > 0);

        res.json({ arpTable });
    });
});


app.get('/dns-servers', (req, res) => {
    fs.readFile('/etc/resolv.conf', 'utf8', (err, data) => {
        if (err) {
            res.status(500).json({ error: 'Failed to retrieve DNS server information' });
            return;
        }

        const dnsServers = data
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.startsWith('nameserver'))
            .map((line) => line.split(' ')[1]);

        res.json({ dnsServers });
    });
});


app.get('/network-statistics', (req, res) => {
    exec('netstat -i', (error, stdout, stderr) => {
        if (error) {
            res.status(500).json({ error: 'Failed to retrieve network statistics' });
            return;
        }

        const networkStatistics = stdout
            .split('\n')
            .slice(2) // Skip the header
            .map((line) => {
                const [interface, mtu, network, address, mask, flags] = line.trim().split(/\s+/);
                return {
                    interface,
                    mtu,
                    network,
                    address,
                    mask,
                    flags,
                };
            });

        res.json({ networkStatistics });
    });
});

app.get('/shared-directories', (req, res) => {
    exec('smbstatus -S', (error, stdout, stderr) => {
        if (error) {
            res.status(500).json({ error: 'Failed to retrieve shared directory information' });
            return;
        }

        const sharedDirectories = stdout
            .split('\n')
            .slice(2) // Skip the header
            .map((line) => line.trim().split(/\s+/))
            .map((parts) => {
                return {
                    name: parts[0],
                    pid: parts[1],
                    machine: parts[2],
                    user: parts[3],
                };
            });

        res.json({ sharedDirectories });
    });
});


app.get('/benchmark-cpu', (req, res) => {
    // Your existing CPU benchmark route
});

app.get('/benchmark-memory', (req, res) => {
    // Your existing memory benchmark route
});

app.get('/cpu-info', (req, res) => {
    res.send('Hello World!')
}) 

app.get('/cpu-info', (req, res) => {
    res.send('Hello World!')
})

app.get('/gpu-info', (req, res) => {
    res.send('Hello World!')
})

app.get('/cpu-info', (req, res) => {
    res.send('Hello World!')
})
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})