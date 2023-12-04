require('dotenv').config();
const express = require('express')
const os = require('os');
const fs = require('fs');
const { exec } = require('child_process');
const WebSocket = require('ws');
const app = express();
const mongoose = require('mongoose');
const http = require('http');

const cors = require('cors');
app.use(cors());

// const server = http.createServer((req, res) => {
//     res.writeHead(200, { 'Content-Type': 'text/plain' });
//     res.end('HTTP server is working!');
//   });
  
  // Upgrade the HTTP server to a WebSocket server
//   const wss = new WebSocket.Server({ server });

app.get('/system-info', (req, res) => {
    try {
        const systemInfo = {
            platform: os.platform(),
            arch: os.arch(),
            totalMemory: os.totalmem(),
            freeMemory: os.freemem(),
            cpus: os.cpus(),
        };
        res.json(systemInfo);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


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

        // Split the stdout by newlines and format it into an array of objects
        const lines = stdout.split('\n');
        const modules = lines.slice(2) // Skip the header lines
            .map(line => {
                const [name, size, used, by] = line.trim().split(/\s+/);
                return {
                    name,
                    size,
                    used,
                    by,
                };
            });

        // Send the array of module objects as a JSON response
        res.json({ modules });
    });
});

app.get('/boot-info', (req, res) => {
    exec('dmesg', (error, stdout, stderr) => {
        if (error) {
            res.status(500).json({ error: 'Failed to retrieve boot information' });
            return;
        }

        // Split the `stdout` by newlines to convert it into an array of lines
        const lines = stdout.split('\n');

        // Create an array of boot information objects with key-value pairs
        const bootInfo = [];
        let currentInfo = {};

        lines.forEach((line) => {
            const [key, ...value] = line.split(': ');
            const formattedLine = value.join(': ');

            if (key && formattedLine) {
                currentInfo[key] = formattedLine;
            } else {
                if (Object.keys(currentInfo).length > 0) {
                    bootInfo.push(currentInfo);
                    currentInfo = {};
                }
            }
        });

        // Send the boot information as JSON
        res.json({ bootInfo });
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

app.get('/gpu-info', (req, res) => {
    exec('lspci | grep VGA', (error, stdout, stderr) => {
        if (error) {
            res.status(500).json({ error: 'Failed to retrieve GPU information' });
            return;
        }

        const gpuInfo = stdout.trim().split('\n').map((line) => {
            const [pci, info] = line.split(': ');
            return { pci, info };
        });

        res.json({ gpuInfo });
    });
});

app.get('/environment-variables', (req, res) => {
    const environmentVariables = Object.entries(process.env).map(([key, value]) => ({
        name: key,
        value: value
    }));
    res.json({ environmentVariables });
});

app.get('/memory', (req, res) => {
    const memoryInfo = {
        memFree: {
            field: 'Free Memory',
            description: 'The amount of physical memory (RAM) that is currently free and available for use.',
            value: `${(os.freemem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
        },
        memAvailable: {
            field: 'Available Memory',
            description: 'The amount of memory that is available for programs to allocate without needing to swap to disk.',
            value: `${((os.totalmem() - os.freemem()) / 1024 / 1024 / 1024).toFixed(2)} GB`,
        },
        buffers: {
            field: 'Buffers',
            description: 'Memory used by the kernel to buffer I/O operations before writing to disk.',
            value: `${((os.totalmem() - os.freemem() - os.totalmem() * (os.freemem() / os.totalmem())) / 1024 / 1024 / 1024).toFixed(2)} GB`,
        },
        cached: {
            field: 'Cached',
            description: 'Memory used by the system for caching data from disks.',
            value: `${(os.totalmem() * (os.freemem() / os.totalmem()) / 1024 / 1024 / 1024).toFixed(2)} GB`,
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
            console.error('Error executing lsusb:', error);
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

        const lines = stdout.split('\n');
        const batteryInfo = {};

        // Iterate through the lines of the output
        for (const line of lines) {
            // Split each line by ':' to separate key and value
            const [key, value] = line.split(':').map(part => part.trim());
            
            // Store key-value pairs in the batteryInfo object
            batteryInfo[key] = value;
        }

        res.json({ battery: batteryInfo });
    });
});

app.get('/sensors', (req, res) => {
    exec('sensors', (error, stdout, stderr) => {
        if (error) {
            res.status(500).json({ error: 'Failed to retrieve sensor information' });
            return;
        }

        // Split the 'stdout' by blank lines to separate sensor sections
        const sensorSections = stdout.split(/\n\s*\n/);

        // Create an array to store sensor data
        const sensorData = [];

        // Process each sensor section
        sensorSections.forEach((section) => {
            const sensorInfo = {};

            // Split each section by lines and extract data
            section.split('\n').forEach((line) => {
                const parts = line.split(':');
                if (parts.length === 2) {
                    const key = parts[0].trim();
                    const value = parts[1].trim();
                    sensorInfo[key] = value;
                }
            });

            // Push sensor data to the array
            sensorData.push(sensorInfo);
        });

        res.json({ sensorData });
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

        // Split the 'stdout' into lines, excluding empty lines
        const lines = stdout.trim().split('\n').filter(line => line.trim() !== '');

        // Create an array to store routing table entries
        const routingTable = [];

        // Iterate through each line to parse and format the routing table entries
        lines.forEach((line) => {
            const [destination, via, dev] = line.split(' ');

            // Create a structured entry for the routing table
            const entry = {
                destination: destination,
                via: via,
                dev: dev
            };

            routingTable.push(entry);
        });

        res.json({ routingTable });
    });
});

app.get('/arp-table', (req, res) => {
    exec('ip neigh', (error, stdout, stderr) => {
        if (error) {
            res.status(500).json({ error: 'Failed to retrieve ARP table information' });
            return;
        }

        // Split the 'stdout' into lines, excluding empty lines
        const lines = stdout.trim().split('\n').filter(line => line.trim() !== '');

        // Create an array to store ARP table entries
        const arpTable = [];

        // Iterate through each line to parse and format the ARP table entries
        lines.forEach((line) => {
            const [ipAddress, macAddress, device] = line.split(' ').filter(Boolean);

            // Create a structured entry for the ARP table
            const entry = {
                ipAddress: ipAddress,
                macAddress: macAddress,
                device: device
            };

            arpTable.push(entry);
        });

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
            .map((line) => ({ 'dnsServer': line.split(' ')[1] }));

        res.json(dnsServers);
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

app.get('/api/agents', async (req, res) => {
    console.log("enter");
    try {
      const agents = await Agent.find({}); // Retrieve all data from the collection
        console.log("request receive");
      // Send the retrieved data as a response
      res.status(200).json({ success: true, agents });
    } catch (error) {
      // Handle errors
      res.status(500).json({ success: false, message: 'Server Error bro' });
    }
  });

  const server = http.createServer(app);


const wss = new WebSocket.Server({ server });

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});


const agentSchema = new mongoose.Schema({
  name: String,
  cpu: [{ model: String, speed: Number }],
  gpu: [{ description: String, product: String, vendor: String }],
  memory: String,
  lastFetched: { type: Date, default: Date.now } // Field to store the last fetched timestamp
});

const Agent = mongoose.model('agentData', agentSchema);

wss.on('connection', (ws) => {
  console.log('Agent connected.');

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Received hardware information from agent:', data);

      if (data.name) {
        const agent = await Agent.findOneAndUpdate(
          { name: data.name },
          { $set: { ...data } },
          { upsert: true, new: true }
        );
        console.log('Data stored/updated in MongoDB:', agent);
      } else {
        console.error('Agent name not provided.');
      }
    } catch (error) {
      console.error('Error parsing message:', error.message);
    }
  });

  ws.on('close', () => {
    console.log('Agent disconnected.');
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
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
