import React, { useEffect, useState } from 'react';
import Navbar from './Navbar';
import axios from 'axios';

function bytesToSize(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    if (bytes === 0) return '0 Byte';

    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));

    return Math.round(10 * (bytes / Math.pow(1024, i))) / 10 + ' ' + sizes[i];
}

function getOS(inputString) {
    const parts = inputString.split('_');
    return parts[0];
}

function SystemInfo() {
    const [systemInfo, setSystemInfo] = useState(null);
    const [osInfo, setOsInfo] = useState(null);

    useEffect(() => {
        const fetchSystemInfo = () => {
            axios
                .get('http://localhost:5000/system-info')
                .then((response) => {
                    setSystemInfo(response.data);
                })
                .catch((error) => {
                    console.error('Error fetching system info:', error);
                });
        };

        const fetechOsInfo = () => {
            axios
                .get('http://localhost:5000/operating-system-info')
                .then((response) => {
                    console.log('res - ', response.data);
                    setOsInfo(response.data);
                })
                .catch((error) => {
                    console.error('Error fetching Os info ', error);
                })
        }

        fetchSystemInfo();
        fetechOsInfo();
    }, []);

    return (
        <div class="m-auto mt-2 max-w-sm p-6 bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700">
            <a href="#">
                <h5 class="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-blue-500">System Information</h5>
            </a>
            {
                (systemInfo && osInfo) ?
                    <div className="text-gray-800 dark:text-white text-left">
                        <p className="mb-2">
                            <span className="font-semibold text-blue-500">Model:</span> {systemInfo.cpus[0].model}
                        </p>
                        <p className="mb-2">
                            <span className="font-semibold text-blue-500">Hostname :</span> {osInfo.hostname}
                        </p>
                        <p className="mb-2">
                            <span className="font-semibold text-blue-500">Operating System:</span> {getOS(osInfo.type)}
                        </p>
                        <p className="mb-2">
                            <span className="font-semibold text-blue-500">Release:</span> {osInfo.release}
                        </p>
                        <p className="mb-2">
                            <span className="font-semibold text-blue-500">Architecture:</span> {systemInfo.arch}
                        </p>
                        <p className="mb-2">
                            <span className="font-semibold text-blue-500">Free Memory:</span> {bytesToSize(systemInfo.freeMemory)}
                        </p>
                        <p className="mb-2">
                            <span className="font-semibold text-blue-500">Platform:</span> {systemInfo.platform}
                        </p>
                        <p className="mb-2">
                            <span className="font-semibold text-blue-500">Total Memory:</span> {bytesToSize(systemInfo.totalMemory)}
                        </p>

                        <p>
                            <span className="font-semibold text-blue-500">Speed:</span> {systemInfo.cpus[0].speed}
                        </p>
                    </div>


                    : null
            }

        </div>
    );

}

export default SystemInfo;