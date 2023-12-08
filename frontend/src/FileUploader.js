import React, { useState } from 'react';
import axios from 'axios';
import { useDropzone } from 'react-dropzone';
import 'tailwindcss/tailwind.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const programming_languages = {
    'cpp': 'cpp',
    'py': 'python',
    'js': 'javascript'
}
const FileUploader = ({ clientId }) => {
  const notify = () => toast("Job Queued Successfully!");
  const [file, setFile] = useState(null);

  const onDrop = (acceptedFiles) => {
    setFile(acceptedFiles[0]);
  };
  const { getRootProps, getInputProps } = useDropzone({ onDrop, maxFiles: 1 });

  const uploadFile = async () => {
    
    if (!file || !clientId) {
      alert('Please select a file.');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('clientId', clientId);

      // Customize the file type if needed
      const fileType = file.name.split('.')[1];
      formData.append('fileType', programming_languages[fileType]);

      const response = await axios.post('https://dfs-backend.onrender.com/upload-file', formData);

      if (response.data.success) {
        notify();
        // You can add additional logic here after successful upload
      } else {
        alert('Error uploading file. Please try again.');
      }
    } catch (error) {
      console.error('Error uploading file:', error.message);
      alert('Error uploading file. Please try again.');
    }
  };

  return (
    <div className= "flex mt-0 items-center justify-center bg-indigo-950">
      <div className="w-full max-w-md p-4 bg-gray-800 rounded-md">
  <div className="bg-blue-700 rounded-md p-6 cursor-pointer" {...getRootProps()}>
    <input {...getInputProps()} />
    <p className="text-white">Drag & drop a file here, or click to select a file</p>
  </div>
  {file && (
    <div className="mt-4">
      <p className="text-gray-300">Selected File: {file.name}</p>
    </div>
  )}
  <div className="mt-6">
    <button onClick={uploadFile} className="px-4 py-2 bg-blue-500 rounded-md text-white">
      Upload File
    </button>
  </div>
</div>
<ToastContainer />
    </div>
  );
};

export default FileUploader;
