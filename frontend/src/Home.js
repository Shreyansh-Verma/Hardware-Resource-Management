import React, { useEffect, useState } from 'react';
import Navbar from './Navbar';
import axios from 'axios';
import SystemInfo from './SystemInfo';
import MemoryInfo from './MemoryInfo';

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

function Home() {
    return (
        <div>
            <div>
                <Navbar />
            </div>
            <div className="flex flex-row">
                <SystemInfo />
                <MemoryInfo />
            </div>
        </div>
    );

}

export default Home;