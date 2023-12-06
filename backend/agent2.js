const WebSocket = require('ws');
const { execSync } = require('child_process');
const os = require('os');

const machineName = os.hostname(); // Fetch the machine name dynamically

const ws = new WebSocket('wss://dfs-backend.onrender.com');
// const ws = new WebSocket('ws://localhost:5000'); // WebSocket connection to central server


ws.on('open', () => {
  console.log('Agent connected to central server.');

  function sendHardwareInfo() {
    const cpuInfo = getCPUInfo();
    const memoryInfo = `${(os.totalmem() / (1024 * 1024 * 1024)).toFixed(2)} GB`; // Total memory in GB with 2 decimal places

    let gpuInfo = 'N/A'; // Placeholder for GPU info
    try {
      const rawGpuInfo = execSync('sudo lshw -C display').toString();
      gpuInfo = parseGpuInfo(rawGpuInfo);
    } catch (error) {
      console.error(`Error fetching GPU info: ${error.message}`);
    }

    const hardwareInfo = {
      name: machineName, // Include the machine name dynamically
      cpu: cpuInfo.map(cpu => ({ ...cpu, isAvailable: cpu.isAvailable })), // Initialize availability status
      gpu: gpuInfo.map(gpu => ({ ...gpu, isAvailable: false })), // Initialize availability status
      memory: memoryInfo,
      lastFetched: new Date()
    };

    ws.send(JSON.stringify(hardwareInfo)); // Send CPU, GPU, and memory info along with the machine name to central server
  }

  sendHardwareInfo();
  setInterval(sendHardwareInfo, 30000);
});


ws.on('message', (message) => {
  try {
    const receivedData = JSON.parse(message);
    console.log('Received message from the server:', receivedData);
    // Handle received data here as needed
  } catch (error) {
    console.error('Error parsing incoming message:', error);
  }
});

ws.on('close', () => {
  console.log('Connection to central server closed.');
});

// Function to get CPU information
function getCPUInfo() {
  const cpus = os.cpus();
  const cpuDetails = cpus.map(core => {
    const idleTime = core.times.idle;
    const totalTime = Object.values(core.times).reduce((acc, val) => acc + val, 0);
    const idlePercentage = (idleTime / totalTime) * 100;
    console.log("idle percentage = ",idlePercentage);
    return {
      model: core.model,
      speed: core.speed,
      idlePercentage: idlePercentage.toFixed(2), // Idle percentage to two decimal places
      isAvailable: idlePercentage > 80 // Set availability status based on idle percentage threshold
    };
  });
  return cpuDetails;
}
// Function to parse GPU information
function parseGpuInfo(rawInfo) {
  const gpuInfoArray = [];
  const gpuRegex = /  \*-display([\s\S]*?)(?=\s{2,}\*-display|$)/g;
  const gpuMatches = rawInfo.matchAll(gpuRegex);

  for (const match of gpuMatches) {
    const gpuDetails = {};
    const gpuDetailsString = match[1];

    gpuDetails.description = gpuDetailsString.match(/description: (.+)$/m)?.[1]?.trim() || 'N/A';
    gpuDetails.product = gpuDetailsString.match(/product: (.+)$/m)?.[1]?.trim() || 'N/A';
    gpuDetails.vendor = gpuDetailsString.match(/vendor: (.+)$/m)?.[1]?.trim() || 'N/A';
    gpuDetails.physicalId = gpuDetailsString.match(/physical id: (.+)$/m)?.[1]?.trim() || 'N/A';
    gpuDetails.busInfo = gpuDetailsString.match(/bus info: (.+)$/m)?.[1]?.trim() || 'N/A';
    gpuDetails.version = gpuDetailsString.match(/version: (.+)$/m)?.[1]?.trim() || 'N/A';
    gpuDetails.width = gpuDetailsString.match(/width: (.+)$/m)?.[1]?.trim() || 'N/A';
    gpuDetails.clock = gpuDetailsString.match(/clock: (.+)$/m)?.[1]?.trim() || 'N/A';
    gpuDetails.capabilities = gpuDetailsString.match(/capabilities: (.+)$/m)?.[1]?.trim() || 'N/A';
    gpuDetails.configuration = gpuDetailsString.match(/configuration: (.+)$/m)?.[1]?.trim() || 'N/A';
    gpuDetails.resources = gpuDetailsString.match(/resources: (.+)$/m)?.[1]?.trim() || 'N/A';

    gpuInfoArray.push(gpuDetails);
  }

  return gpuInfoArray;
}
