import React, { useEffect, useState } from 'react';
import axios from 'axios';

function FileSystems() {
    const [fsInfo, setfsInfo] = useState([]);
    const [isExpanded, setIsExpanded] = useState(false);
    useEffect(() => {
        const fetchMemInfo = () => {
            axios
                .get('http://localhost:5000/file-systems')
                .then((response) => {
                    // console.log('res boot info =  ', response.data);
                    setfsInfo(response.data.fileSystems);
                })
                .catch((error) => {
                    console.error('Error fetching mem info:', error);
                });
        };

        fetchMemInfo();
    }, []);

    return (
        <div class="max-h-[50vh] overflow-auto m-auto mt-2 max-w-sm p-6 bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700">
            <a href="#">
                <h5 class="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-blue-500">File Systems</h5>
            </a>
            <button
                className="text-blue-500 cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                {isExpanded ? '▼' : '▶'}
            </button>
            
            {isExpanded && fsInfo ? (
            <div className="text-gray-800 dark:text-white text-left">
                {Object.entries(fsInfo).map(([sectionName, sectionData], index) => (
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

export default FileSystems;