const WebSocket = require('ws');
const { exec } = require('child_process');
const os = require('os');

const ws = new WebSocket('ws://localhost:5000'); // WebSocket connection to central server

ws.on('open', () => {
  console.log('Agent connected to central server.');

  // Function to send hardware information to central server
  function sendHardwareInfo() {
    const cpuInfo = os.cpus(); // Collect CPU information
    let gpuInfo = '';

    // Execute nvidia-smi command to get GPU information
    exec('nvidia-smi', (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing nvidia-smi: ${error.message}`);
        gpuInfo = 'Error fetching GPU info';
      } else if (stderr) {
        console.error(`nvidia-smi error: ${stderr}`);
        gpuInfo = 'Error fetching GPU info';
      } else {
        gpuInfo = stdout; // Output contains GPU information
      }

      const storageInfo = os.totalmem(); // Collect total memory (storage) information

      const hardwareInfo = {
        cpu: cpuInfo,
        gpu: gpuInfo,
        storage: storageInfo,
        // Add more hardware information as needed
      };

      ws.send(JSON.stringify(hardwareInfo)); // Send hardware information to central server
    });
  }

  // Send hardware details initially and every 30 seconds thereafter
  sendHardwareInfo(); // Send immediately upon connection
  setInterval(sendHardwareInfo, 30000); // Send every 30 seconds
});

ws.on('close', () => {
  console.log('Connection to central server closed.');
});
