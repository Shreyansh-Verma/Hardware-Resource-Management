const WebSocket = require('ws');
const { exec , execSync} = require('child_process');
// const { execSync } = require('child_process');
// const execPromise = util.promisify(exec);
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
      console.log("")
      const rawGpuInfo = execSync('sudo lshw -C display').toString();
      gpuInfo = parseGpuInfo(rawGpuInfo);
    } catch (error) {
      console.error(`Error fetching GPU info: ${error.message}`);
    }
    const hardwareInfo = {
      infoType: "hardwareInfo",
      name: machineName, // Include the machine name dynamically
      cpu: cpuInfo.map(cpu => ({ ...cpu, isAvailable: cpu.isAvailable , idlePercentage: cpu.idlePercentage + '%' })), // Initialize availability status
      gpu: gpuInfo.map(gpu => ({ ...gpu, isAvailable: true })), // Initialize availability status
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
    const receivedContent = JSON.parse(message);
    console.log("received Data = ", receivedContent);
    console.log("id = ,",receivedContent.task.clientId)
    if (receivedContent.task.fileType === 'python') {
      executePython(receivedContent.task.fileContent, receivedContent.task.clientId);
    } else if (receivedContent.task.fileType === 'cpp') {
      executeCpp(receivedContent.task.fileContent);
    } else if (receivedContent.task.fileType === 'javascript') {
      executeJavascript(receivedContent.task.fileContent);
    } else {
      console.log('Unsupported file type:', receivedContent.task.fileType);
    }
  } catch (error) {
    console.error('Error parsing incoming message:', error);
  }
});

function executePython(code, id) {
  // Run Python code
  // For example:
  execSync(`python3 -c "${code}"`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing Python code: ${error}`);
      sendResult(error, id);
      return;
    }
    console.log('Python output:', stdout);
    sendResult(stdout, id);
  });
}

function executeCpp(code) {
  // Run C++ code
  // For example:
  exec(`g++ -o output.out -xc++ - <<< "${code}" && ./output.out`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing C++ code: ${error}`);
      return;
    }
    console.log('C++ output:', stdout);
    sendResult(stdout);
  });
}

function executeJavascript(code) {
  // Execute JavaScript code
  // Use eval to execute JavaScript code (use with caution)
  // For example:
  try {
    eval(code);
  } catch (error) {
    console.error(`Error executing JavaScript code: ${error}`);
  }
}

function sendResult(result, id) {
  // Send the result back to the main server through the WebSocket
  ws.send(JSON.stringify({
    infoType: "outputInfo",
    clientId: id,
    result 
  }));
}

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
  console.log("enter rawInfo = ",rawInfo);
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
