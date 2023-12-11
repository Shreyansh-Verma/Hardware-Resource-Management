const { TaskQueue, generateClientId, app } = require('../server');
const request = require('supertest');
const fs = require('fs');
const mongoose = require('mongoose');
const express = require('express');
const { exec } = require('child_process');
const multer = require('multer');
const os = require('os');

jest.mock('os');

// Mock the mongoose module
jest.mock('mongoose', () => {
  const mongoose = {
    connect: jest.fn(), // Mock the connect function
    model: jest.fn(() => ({
      findOneAndUpdate: jest.fn(),
      find: jest.fn(),
    })),
    Schema: jest.fn(() => ({
      set: jest.fn(),
    })),
  };
  return mongoose;
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

// File system mock
jest.mock('fs', () => ({
  readFileSync: jest.fn(),
  unlinkSync: jest.fn(),
  mkdirSync: jest.fn(), // Ensure 'mkdirSync' is mocked if used in the code
}));

// Tests description
describe('TaskQueue Tests', () => {
  let taskQueue;

  beforeEach(() => {
    // Create a new instance of TaskQueue before each test
    taskQueue = new TaskQueue();
  });

  it('should enqueue a task correctly', async () => {
    const task = { type: 'example', payload: 'some data' };
    await taskQueue.enqueue(task);

    expect(taskQueue.queue).toHaveLength(1);
    expect(taskQueue.queue[0]).toEqual(task);
  });

  it('should fetch a task from the queue', async () => {
    const task1 = { type: 'example', payload: 'some data' };
    const task2 = { type: 'another', payload: 'different data' };

    await taskQueue.enqueue(task1);
    await taskQueue.enqueue(task2);

    const fetchedTask1 = await taskQueue.fetchTask();
    const fetchedTask2 = await taskQueue.fetchTask();
    const fetchedTask3 = await taskQueue.fetchTask(); // Should return null as the queue is empty

    expect(fetchedTask1).toEqual(task1);
    expect(fetchedTask2).toEqual(task2);
    expect(fetchedTask3).toBeNull();
  });
});

// Test generate client Id
describe('generateClientId function', () => {
  it('should generate a random 9-character string', () => {
    const clientId = generateClientId();
    expect(typeof clientId).toBe('string'); // Check if the generated ID is a string
    expect(clientId.length).toBe(9); // Check if the length of the generated ID is 9 characters
  });
});

jest.mock('child_process');

describe('GET /battery', () => {
  it('should return battery information', async () => {
    const mockStdout = `
      state: discharging
      energy: 50%
      ...
    `;

    exec.mockImplementation((command, callback) => {
      callback(null, mockStdout, null);
    });

    const response = await request(app).get('/battery');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('battery');
  });

  it('should handle error when retrieving battery information fails', async () => {
    exec.mockImplementation((command, callback) => {
      callback(new Error('Failed to execute command'), null, 'Error message');
    });

    const response = await request(app).get('/battery');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Failed to retrieve battery information' });
  });
});

describe('GET /usb-devices', () => {
  it('should return USB device information', async () => {
    const mockStdout = `
      Bus 001 Device 001: ID 1d6b:0002 Linux Foundation 2.0 root hub
      Bus 002 Device 001: ID 1d6b:0003 Linux Foundation 3.0 root hub
      ...
    `;

    exec.mockImplementation((command, callback) => {
      callback(null, mockStdout, null);
    });

    const response = await request(app).get('/usb-devices');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('usbDevices');
  });

  it('should handle error when retrieving USB device information fails', async () => {
    exec.mockImplementation((command, callback) => {
      callback(new Error('Failed to execute lsusb'), null, 'Error message');
    });

    const response = await request(app).get('/usb-devices');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Failed to retrieve USB device information' });
  });
});

describe('GET /pci-devices', () => {
  it('should return PCI device information', async () => {
    const mockStdout = `
      00:00.0 Host bridge: Intel Corporation Xeon E3-1200 v6/7th Gen Core Processor Host Bridge/DRAM Registers (rev 02)
      00:01.0 PCI bridge: Intel Corporation Xeon E3-1200 v5/E3-1500 v5/6th Gen Core Processor PCIe Controller (x16) (rev 02)
      ...
    `;

    exec.mockImplementation((command, callback) => {
      callback(null, mockStdout, null);
    });

    const response = await request(app).get('/pci-devices');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('pciDevices');
  });

  it('should handle error when retrieving PCI device information fails', async () => {
    exec.mockImplementation((command, callback) => {
      callback(new Error('Failed to execute lspci'), null, 'Error message');
    });

    const response = await request(app).get('/pci-devices');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Failed to retrieve PCI device information' });
  });
});

describe('GET /memory', () => {
  it('should return memory information', async () => {
    const mockMemoryInfo = {
      memFree: os.totalmem() / 4, // Mocking 1/4th of total memory as free
      memAvailable: os.totalmem() / 2, // Mocking 1/2 of total memory as available
      buffers: os.totalmem() / 8, // Mocking 1/8th of total memory as buffers
      cached: os.totalmem() / 8, // Mocking 1/8th of total memory as cached
      // Mock other memory types as needed
    };

    os.totalmem.mockReturnValue(mockMemoryInfo.memFree + mockMemoryInfo.memAvailable);

    const response = await request(app).get('/memory');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('memory');
    expect(response.body.memory).toEqual({
      memFree: {
        field: 'Free Memory',
        description: expect.any(String),
        value: `${(mockMemoryInfo.memFree / 1024 / 1024 / 1024).toFixed(2)} GB`,
      },
      memAvailable: {
        field: 'Available Memory',
        description: expect.any(String),
        value: `${(mockMemoryInfo.memAvailable / 1024 / 1024 / 1024).toFixed(2)} GB`,
      },
      buffers: {
        field: 'Buffers',
        description: expect.any(String),
        value: `${(mockMemoryInfo.buffers / 1024 / 1024 / 1024).toFixed(2)} GB`,
      },
      cached: {
        field: 'Cached',
        description: expect.any(String),
        value: `${(mockMemoryInfo.cached / 1024 / 1024 / 1024).toFixed(2)} GB`,
      },
    });
  });
});

