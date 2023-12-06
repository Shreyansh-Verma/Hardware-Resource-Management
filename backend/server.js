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
app.use(cors());
const agents = new Map();
const rabbitmqConnectionString = 'amqp://localhost'; // Update with your RabbitMQ connection string

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

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Received hardware information from agent:', data);

      if (data.name) {
        agents.set(data.name, ws);
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

// Route to handle the request for sending tasks to available CPUs
app.post('/send-task', async (req, res) => {
  // Assuming the task is received in the request body
  // const { task } = req.body;
  const task = "task"; // Placeholder for the task

  const response = await getAvailableCPUs();
  if (response.success) {
    const { availableCPUs } = response;
    if (availableCPUs.length > 0) {
      // For simplicity, let's assume we send the task to the first available CPU
      const cpuToSend = availableCPUs[0]; // Modify this logic to suit your requirements
      console.log("cpu to send", cpuToSend.name);

      // Assuming 'agents' is a Map or an object where agents are stored by name
      const wsToSend = agents.get(cpuToSend.name); // Get the WebSocket for the CPU

      if (wsToSend) {
        wsToSend.send(JSON.stringify({ task })); // Sending task to the WebSocket associated with the CPU name
        res.status(200).json({ success: true, message: 'Task sent to CPU' });
      } else {
        res.status(404).json({ success: false, message: 'No WebSocket found for the CPU' });
      }
    } else {
      res.status(404).json({ success: false, message: 'No available CPUs' });
    }
  } else {
    res.status(500).json(response);
  }
});

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
