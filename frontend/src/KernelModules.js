import React, { useEffect, useState } from 'react';
import axios from 'axios';

function KernelModule() {
    const [kernelInfo, setKernelInfo] = useState([]);
    const [isExpanded, setIsExpanded] = useState(false);
    useEffect(() => {
        const fetchMemInfo = () => {
            axios
                .get('http://localhost:5000/kernel-modules')
                .then((response) => {
                    // console.log('res keys =  ', response.data.modules);
                    setKernelInfo(response.data.modules);
                })
                .catch((error) => {
                    console.error('Error fetching mem info:', error);
                });
        };

        fetchMemInfo();
    }, []);

    return (
        <div class="max-h-[50vh] overflow-auto m-auto mt-2 max-w-sm p-6 bg-white border border-gray-200 rounded-lg shadow max-h-[50vh] overflow-auto dark:bg-gray-800 dark:border-gray-700">
            <a href="#">
                <h5 class="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-blue-500">Kernel Modules</h5>
            </a>
            <button
                className="text-blue-500 cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                {isExpanded ? '▼' : '▶'}
            </button>
            
            {isExpanded && kernelInfo ? (
            <div className="text-gray-800 dark:text-white text-left">
                {Object.entries(kernelInfo).map(([sectionName, sectionData], index) => (
                    <div key={index}>
                        {Object.entries(sectionData).map(([key, value], keyIndex) => (
                            <div key={keyIndex}>
                                <p>
                                    <span className="font-semibold text-blue-500">
                                        {key}:
                                    </span>{' '}
                                    {value}
                                </p>
                            </div>
                        ))}
                        <hr className='mt-2' />
                    </div>
                ))}
            </div>
        ) : null}

        </div>
    );
}

export default KernelModule;