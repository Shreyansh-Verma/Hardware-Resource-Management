require('dotenv').config();
const express = require('express')
const os = require('os');
const fs = require('fs');
const { exec } = require('child_process');
const WebSocket = require('ws');
const app = express();
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const http = require('http');
const cors = require('cors');
const amqp = require('amqplib');
const multer = require('multer');
const agents = new Map();
const socketName = new Map();
const clients = new Map();
const upload = multer({ dest: 'uploads/' }); // Destination folder for uploaded files
const rabbitmqConnectionString = 'amqp://localhost'; // Update with your RabbitMQ connection string
app.use(bodyParser.json());


app.use(cors());

// Establish connection to RabbitMQ
let channel; // Declare channel outside to make it accessible to the routes

async function connectToQueue() {
  try {
    // const connection = await amqp.connect('amqp://localhost');
    const connection = await amqp.connect('amqp://rabbitmq:1234@dfs-rabbitmq:5672');
    channel = await connection.createChannel();
    channel.assertQueue('taskQueue', { durable: true });
    console.log('Connected to RabbitMQ');
  } catch (error) {
    console.error('Error connecting to RabbitMQ:', error.message);
  }
} 

async function clearQueue(queueName) {
  try {
    // const connection = await amqp.connect('amqp://localhost');
    const connection = await amqp.connect('amqp://rabbitmq:1234@dfs-rabbitmq:5672');
    const channel = await connection.createChannel();
    await channel.assertQueue(queueName);
    await channel.purgeQueue(queueName);
    console.log(`Queue ${queueName} purged.`);
    await channel.close();
    await connection.close();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Call the function to clear a queue
// clearQueue('taskQueue');

// connectToQueue(); // Call this function to establish the connection

class TaskQueue {
  constructor() {
    this.queue = [];
    this.mutex = false;
  }

  async enqueue(task) {
    await this.acquireLock();
    this.queue.push(task);
    this.releaseLock();
    // this.processQueue();
  }

  async acquireLock() {
    while (this.mutex) {
      await new Promise(resolve => setTimeout(resolve, 100)); // Adjust the delay as needed
    }
    this.mutex = true;
  }

  releaseLock() {
    this.mutex = false;
  }

  async fetchTask() {
    if (this.mutex) return null;

    this.mutex = true;
    const task = this.queue.shift();
    this.mutex = false;

    if (task) {
      console.log('Received task:', task);
      // Process the task...
      return task;
    } else {
      console.log('No task found.');
      return null;
    }
  }
}


const taskQueue = new TaskQueue();

// Function to generate a unique identifier
function generateClientId() {
  return Math.random().toString(36).substr(2, 9); // Example: Generates a random 9-character string
}

app.post('/upload-file-rabbitmq', upload.single('file'), async (req, res) => {
  
  try {
    const fileType  = req.body.fileType; // Assuming fileType is sent from the frontend
    const clientId = req.body.clientId;
    const filePath = req.file.path; // Path to the uploaded file
    const fileContent = fs.readFileSync(filePath, 'utf-8'); // Read file content
    fs.unlinkSync(filePath); // Delete the uploaded file after reading its content
    const task = { fileType, fileContent }; // Task payload includes file type and content

    const response = await getAvailableCPUs();
    if (response.success) {
      const { availableCPUs } = response;
      if (availableCPUs.length > 0) {
        const cpuToSend = availableCPUs[0]; // Assuming sending to the first available CPU
        console.log('CPU to send task:', cpuToSend.name);
        
        channel.sendToQueue(
          'taskQueue',
          Buffer.from(JSON.stringify({clientId:clientId,  fileType:fileType , task, cpuName: cpuToSend.name })),
          { persistent: true }
        );

        res.status(200).json({ success: true, message: 'Task added to the queue' });
      } else {
        res.status(404).json({ success: false, message: 'No available CPUs' });
      }
    } else {
      res.status(500).json(response);
    }
  } catch (error) {
    console.error('Error handling file upload:', error.message);
    res.status(500).json({ success: false, message: 'Error handling file upload' });
  }
});

// Route to upload-file
app.post('/upload-file', upload.single('file'), async (req, res) => {
  try {
    const fileType = req.body.fileType;
    const filePath = req.file.path;
    const clientId = req.body.clientId;
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    fs.unlinkSync(filePath);
    const task = { clientId, fileType, fileContent };
    
    await taskQueue.enqueue(task);

    res.status(200).json({ success: true, message: 'Task added to the queue' });
  } catch (error) {
    console.error('Error handling file upload:', error.message);
    res.status(500).json({ success: false, message: 'Error handling file upload' });
  }
});

// Endpoint to retrieve all CPUs
app.get('/get-cpus', async (req, res) => {
  try {
    const allCPUs = await Agent.find({ 'cpu.isAvailable': true }).select('name cpu');
    console.log("cpu = ",allCPUs);
    // const cpuModels = allCPUs.map(agent => agent.cpu.model).flat(); // Extract CPU models
    // console.log("cpu model = ",cpuModels);
    res.status(200).json(allCPUs);
  } catch (error) {
    console.error('Error retrieving all CPUs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to retrieve all GPUs
app.get('/get-gpus', async (req, res) => {
  try {
    const allGPUs = await Agent.find({ 'gpu.isAvailable': true }).select('name gpu');
    console.log("gpu = ",allGPUs);

    res.status(200).json(allGPUs);
  } catch (error) {
    console.error('Error retrieving all CPUs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to retrieve all machines
app.get('/get-machines', async (req, res) => {
  try {
    const allMachines = await Agent.find({}, 'name');
    res.status(200).json(allMachines);
  } catch (error) {
    console.error('Error retrieving all machines:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route to retrieve all the agents.
app.get('/api/agents', async (req, res) => {
    // console.log("enter");  
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

// Database Schmea 
 // name :  Contains name of the database.
 // cpu: It consist list of the cpu cores present with additional information like model, speed, idle percentage.
 // gpu: It consist list of GPUs present with additional information like description, product, vendor.
 // memory; It denotes the available memory of the system.
 // lastFetched: It denotes the last timestamp when the record was fetched.

const agentSchema = new mongoose.Schema({
  name: String,
  cpu: [{
    model: String,
    speed: Number,
    idlePercentage: String,
    isAvailable: { type: Boolean} // Field to denote CPU availability
  }],
  gpu: [{
    description: String,   
    product: String,
    vendor: String,
    isAvailable: { type: Boolean} // Field to denote GPU availability
  }],
  memory: String,
  lastFetched: { type: Date, default: Date.now } // Field to store the last fetched timestamp
});

// Establish connection to the db.

const Agent = mongoose.model('agentData', agentSchema);

// Establish connection to the web socket.

wss.on('connection', (ws) => {
  console.log('Agent connected.');

  // Generate a unique identifier for the WebSocket connection
  const clientId = generateClientId();
  // Store the WebSocket connection using the generated identifier
  console.log("Client id = ",clientId);
  clients.set(clientId, ws);
  
  // Send the identifier back to the client
  ws.send(JSON.stringify({task: {fileType:"NA", clientId: clientId }}));

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      // console.log('Received hardware information from agent:', data);
      if(data.infoType==="hardwareInfo")
      {
        if (data.name) {
          agents.set(data.name, ws);
          socketName.set(ws,data.name);
          const agent = await Agent.findOneAndUpdate(
            { name: data.name },
            { $set: { ...data } },
            { upsert: true, new: true }
          );
          // console.log('Data stored/updated in MongoDB:', agent);
        } else {
          console.error('Agent name not provided.');
        }
      }
      else if (data.infoType === "clientConn")
      {
        // console.log("output data = ",data);
      }
      else
      {
        console.log("output data = ",data); 
        if(clients.has(data.clientId))
        {
          clients.get(data.clientId).send(JSON.stringify({ fileContent: data.result}));
        }
      }
    } catch (error) {
      console.error('Error parsing message:', error.message);
    }
  }); 
   
  ws.on('close', async() => {
    console.log('WebSocket connection closed.');
      // Delete the entry from the database based on the name
      if (socketName.has(ws))
      {
        try {
          console.log("name = ", socketName.get(ws));
          const deletedAgent = await Agent.findOneAndDelete({ name: socketName.get(ws) });

          if (!deletedAgent) {
            console.log(`Agent '' not found in the database.`);
          } else {
            console.log(`Agent '' has been removed from the database.`);
          }
          
          // Remove from the agents Map (assuming agents is a Map)
          agents.delete(socketName.get(ws));
        } catch (error) {
          console.error('Error deleting agent from the database:', error);
        }
      }
  });

});


// Route to find all available CPUs along with agent names
async function getAvailableCPUs() {
  try {
    const availableCPUs = await Agent.find({ 'cpu.isAvailable': true }).select('name cpu');
    return { success: true, availableCPUs };
  } catch (error) {
    return { success: false, message: 'Server Error' };
  }
}

// Function to get available GPUs
async function getAvailableGPUs() {
  try {
    const availableGPUs = await Agent.find({ 'gpu.isAvailable': true }).select('name gpu');
    return { success: true, availableGPUs };
  } catch (error) {
    return { success: false, message: 'Server Error' };
  }
}

// Function to allocate available CPUs to queue tasks when CPUs are free
async function allocateCPUsToTasksRabbit() {
  const response = await getAvailableCPUs();
  if (response.success) {
    const { availableCPUs } = response;
    if (availableCPUs.length > 0) {
      // console.log("Enter", availableCPUs);
      // Assume there's a method to fetch tasks from the queue
      const taskFromQueue = await fetchTaskFromQueue();
      // console.log("task = ",taskFromQueue===null)
      if (taskFromQueue) {
        const cpuToSend = availableCPUs[0]; // Modify this logic to suit your requirements

        if(clients.has(taskFromQueue.clientId))
        {
          clients.get(taskFromQueue.clientId).send(JSON.stringify({ machine: cpuToSend.name}));
        }

        // Assuming 'agents' is a Map or an object where agents are stored by name
        const wsToSend = agents.get(cpuToSend.name); // Get the WebSocket for the CPU

        if (wsToSend) {
          wsToSend.send(JSON.stringify({ task: taskFromQueue })); // Sending task to the WebSocket associated with the CPU name
        }
      }
    }
  }
}

// Endpoint to deallocate resources by name
app.post('/deallocate', async (req, res) => {
  const { name } = req.body; // Assuming 'name' is sent in the request body

  try {
    // Find the entry by name and remove it from the database
   
    if(agents.has(name))
    {
      agents.get(name).close();
      agents.delete(agents.get(name));
    }

    return res.status(200).json({ success: true, message: 'Resource deallocated successfully' });
  } catch (error) {
    console.error('Error deallocating resource:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// This system checks for available tasks and if available checks for a available cpus to allocate the task to them.
async function allocateCPUsToTasks() {
  try {
    const response = await getAvailableCPUs();
    if (response.success) {
      const { availableCPUs } = response;
      if (availableCPUs.length > 0) {
        const cpuToSend = availableCPUs[0]; // Modify this logic to suit your requirements
        console.log('Available CPUs:', availableCPUs.length);
        console.log('Allocating task to CPU:', cpuToSend.name);

        const taskFromQueue = await taskQueue.fetchTask();
        if (taskFromQueue) {
          if (clients.has(taskFromQueue.clientId)) {
            clients.get(taskFromQueue.clientId).send(JSON.stringify({ machine: cpuToSend.name }));
          }

          const wsToSend = agents.get(cpuToSend.name);
          if (wsToSend) {
            wsToSend.send(JSON.stringify({ task: taskFromQueue }));
          }
        }
      } else {
        console.log('No available CPUs');
      }
    }
  } catch (error) {
    console.error('Error allocating CPUs to tasks:', error.message);
  }
}

// Check if any task is present in the queue and fetch the task from the queue.
async function fetchTaskFromQueue() {
  try {
    const queue = 'taskQueue';
    const message = await channel.get(queue, { noAck: false });

    if (message) {
      const task = message.content.toString();
      console.log('Received task:', task);
      // Process the task...
      return task;
    } else {
      console.log('No task found.');
      return null;
    }
  } catch (error) {
    console.error('Error fetching task from queue:', error.message);
    return null;
  }
}
// Call the function periodically to allocate CPUs to queue tasks
setInterval(allocateCPUsToTasks, 5000);

// Route to find all available GPUs along with agent names
app.get('/available-gpus', async (req, res) => {
  try {
    const availableGPUs = await Agent.find({ 'gpu.isAvailable': true }).select('name gpu');
    res.status(200).json({ success: true, availableGPUs });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Retrieves system info of the server.
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

// This retrieves operating-system-info of the server.
app.get('/operating-system-info', (req, res) => {
  const osInfo = {
      type: os.type(),
      hostname: os.hostname(),
      release: os.release(),
  };

  res.json(osInfo);
});

// This retrieves kernel modules of the server.
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

// This route retrieves boot-info of the server.
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

// This route retrieves file system of the server.
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

// This route retrieves users of the server.
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

// This route retrieves groups of the server.
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

// This route retrieves processors of the server.
app.get('/processors', (req, res) => {
  const cpuInfo = os.cpus();
  res.json({ processors: cpuInfo });
});

// This route retrieves gpu-info of the server.
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

// This route retrieves environment-variables of the server.
app.get('/environment-variables', (req, res) => {
  const environmentVariables = Object.entries(process.env).map(([key, value]) => ({
      name: key,
      value: value
  }));
  res.json({ environmentVariables });
});

// This route retrieves memory of the server.
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

// This route retrieves pci-devices of the server.
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

// This route retrieves usb-devices of the server.
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

// This route retrieves printers of the server.
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

// This route retrieves battery-info of the server.
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

// This route retrieves sensors-devices of the server.
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

// This route retrieves input-devices of the server.
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

// This route retrieves storage-devices of the server.
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

// This route retrieves dmi info of the server.
app.get('/dmi', (req, res) => {
  exec('sudo dmidecode', (error, stdout, stderr) => {
      if (error) {
          res.status(500).json({ error: 'Failed to retrieve DMI information' });
          return;
      }

      res.json({ dmi: stdout });
  });
});

// This route retrieves network-interfaces of the server.
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

// This route retrieves ip-connections of the server.
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

// This route retrieves routing-table info of the server.
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

// This route retrieves arp-table info of the server.
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

// This route retrieves dns table info of the server.
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

// This route retrieves network-interfaces of the server.
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
              const [interfaces, mtu, network, address, mask, flags] = line.trim().split(/\s+/);
              return {
                  interfaces,
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

// This route retrieves shared-directories of the server.
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

module.exports = {
  TaskQueue,
  generateClientId,
};
