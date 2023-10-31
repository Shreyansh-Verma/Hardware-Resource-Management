import React, { useEffect, useState } from 'react';
import axios from 'axios';

function MemoryInfo() {
    const [memInfo, setMemInfo] = useState(null);

    useEffect(() => {
        const fetchMemInfo = () => {
            axios
                .get('http://localhost:5000/memory')
                .then((response) => {
                    console.log('res - ', response.data.memory);
                    setMemInfo(response.data.memory);
                })
                .catch((error) => {
                    console.error('Error fetching mem info:', error);
                });
        };

        fetchMemInfo();
    }, []);

    return (
        <div class="m-auto mt-2 max-w-sm p-6 bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700">
            <a href="#">
                <h5 class="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-blue-500">Mmeory Information</h5>
            </a>
            {
                memInfo ?
                    <div className="text-gray-800 dark:text-white text-left">
                        {memInfo &&
                            Object.entries(memInfo).map(([key, entry]) => (
                                <div className=''>
                                    <p>
                                        <span className="font-semibold text-blue-500">Field:</span> {entry.field}
                                    </p>
                                    <p>
                                        <span className="font-semibold text-blue-500">Description:</span> {entry.description}
                                    </p>
                                    <p>
                                        <span className="font-semibold text-blue-500">Value :</span> {entry.value}
                                    </p>
                                    <hr className='mb-2 mt-2' />
                                </div>
                            ))}

                    </div>


                    : null
            }

        </div>
    );
}

export default MemoryInfo;