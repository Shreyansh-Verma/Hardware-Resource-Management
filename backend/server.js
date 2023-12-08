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
const amqp = require('amqplib');
const multer = require('multer');
const agents = new Map();
const socketName = new Map();
const clients = new Map();
const upload = multer({ dest: 'uploads/' }); // Destination folder for uploaded files
const rabbitmqConnectionString = 'amqp://localhost'; // Update with your RabbitMQ connection string

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

app.post('/send-task', async (req, res) => {
  const task = 'task'; // Placeholder for the task

  try {
    const response = await getAvailableCPUs();
    if (response.success) {
      const { availableCPUs } = response;
      if (availableCPUs.length > 0) {
        const cpuToSend = availableCPUs[0]; // Assuming sending to the first available CPU
        console.log('CPU to send task:', cpuToSend.name);

        channel.sendToQueue(
          'taskQueue',
          Buffer.from(JSON.stringify({ task, cpuName: cpuToSend.name })),
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
    console.error('Error sending task to queue:', error.message);
    res.status(500).json({ success: false, message: 'Error sending task to queue' });
  }
});

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

const Agent = mongoose.model('agentData', agentSchema);

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
    // Find and delete the WebSocket entry from the map when the connection is closed
    // if(clients.has(ws))
    // {
    //   clients.delete(ws);
    // }
    // if (socketName.has(ws))
    // {
    //   agents.delete(socketName.get(ws));  
    // }
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
      console.log("Task from queue = ",taskFromQueue);
      // console.log("task = ",taskFromQueue===null)
      if (taskFromQueue) {
        console.log("Enter = ",taskFromQueue)
        const cpuToSend = availableCPUs[0]; // Modify this logic to suit your requirements
        console.log('Allocating task from queue to CPU:', cpuToSend.name);

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
app.delete('/deallocate/:name', async (req, res) => {
  const { name } = req.params;

  try {
    // Find the entry by name and remove it from the database
    const deletedAgent = await Agent.findOneAndDelete({ name });

    if (!deletedAgent) {
      return res.status(404).json({ success: false, message: 'Resource not found' });
    }

    return res.status(200).json({ success: true, message: 'Resource deallocated successfully' });
  } catch (error) {
    console.error('Error deallocating resource:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

async function allocateCPUsToTasks() {
  try {
    // Assume there's a method to fetch tasks from the queue
    const taskFromQueue = await taskQueue.fetchTask();
    console.log("Task from queue = ", taskFromQueue);

    if (taskFromQueue) {
      const response = await getAvailableCPUs();
      if (response.success) {
        const { availableCPUs } = response;
        if (availableCPUs.length > 0) {
          const cpuToSend = availableCPUs[0]; // Modify this logic to suit your requirements
          console.log('Allocating task from queue to CPU:', cpuToSend.name);

          const wsToSend = agents.get(cpuToSend.name); // Get the WebSocket for the CPU

          if (wsToSend) {
            wsToSend.send(JSON.stringify({ task: taskFromQueue })); // Sending task to the WebSocket associated with the CPU name
          }
        }
      }
    }
  } catch (error) {
    console.error('Error allocating CPUs to tasks:', error.message);
  }
}

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
