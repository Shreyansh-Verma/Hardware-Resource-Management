const request = require('supertest');
const fs = require('fs');
const { TaskQueue, generateClientId, app } = require('../server');
const mongoose = require('mongoose');

// Mock the mongoose module
jest.mock('mongoose', () => {
  const mongoose = {
    connect: jest.fn(), // Mock the connect function
    model: jest.fn(() => ({
      findOneAndUpdate: jest.fn(),
    })),
    Schema: jest.fn(() => ({
      set: jest.fn(),
    })),
  };
  return mongoose;
});

// File system mock
jest.mock('fs', () => ({
  readFileSync: jest.fn(),
  unlinkSync: jest.fn(),
  mkdirSync: jest.fn(), // Ensure 'mkdirSync' is mocked if used in the code
}));


// Tests description.
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

// Test upload-file.
describe('POST /upload-file', () => {
  it('should add a task to the queue when uploading a file', async () => {
    // Mock the file and request body data
    const fileMockPath = '/mocked/path/to/uploaded/file.txt';
    const fileType = 'text';
    const clientId = 'mockedClientId';
    const fileContent = 'Mocked file content';
    
    fs.readFileSync.mockReturnValue(fileContent);

    const mockEnqueue = jest.fn();
    const originalEnqueue = app.__get__('taskQueue').enqueue;
    app.__get__('taskQueue').enqueue = mockEnqueue;

    const response = await request(app)
      .post('/upload-file')
      .field('fileType', fileType)
      .field('clientId', clientId)
      .attach('file', fileMockPath);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, message: 'Task added to the queue' });
    expect(fs.readFileSync).toHaveBeenCalledWith(fileMockPath, 'utf-8');
    expect(fs.unlinkSync).toHaveBeenCalledWith(fileMockPath);
    expect(mockEnqueue).toHaveBeenCalledWith({ clientId, fileType, fileContent });

    // Restore the original enqueue function after the test
    app.__get__('taskQueue').enqueue = originalEnqueue;
  });

  it('should handle file upload error', async () => {
    // Simulate an error during file upload
    fs.readFileSync.mockImplementation(() => {
      throw new Error('Mocked file read error');
    });

    const response = await request(app)
      .post('/upload-file')
      .field('fileType', 'text')
      .field('clientId', 'mockedClientId')
      .attach('file', '/mocked/path/to/uploaded/file.txt');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ success: false, message: 'Error handling file upload' });
  });
});