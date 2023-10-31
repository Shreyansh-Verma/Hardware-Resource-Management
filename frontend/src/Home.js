import React, { useEffect, useState } from 'react';
import Navbar from './Navbar';
import axios from 'axios';
import SystemInfo from './SystemInfo';
import MemoryInfo from './MemoryInfo';
import KernelModule from './KernelModules';
import BootInfo from './BootInfo';
import FileSystems from './FileSystems';
import Users from './Users';
import Groups from './Groups';
import Processors from './Processors';
import Gpus from './GPU';
import EnvVariable from './EnvVariable';
import PciDevices from './PciDevices';
import UsbDevices from './UsbDevices';
import BatteryInfo from './BatteryInfo';
import SensorInfo from './SensorInfo';
import InputDevices from './InputDevices';
import StorageDevices from './StorageDevices';
import NetworkInterface from './NetworkInterface';
import IpConnections from './IpConnections';
import RoutingTable from './RoutingTable';
import ArpTable from './ArpTable';
import DnsServer from './DnsServer';

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
        <div className='m-auto bg-indigo-950'>
            <div>
                <Navbar />
            </div>
            <h1 className='text-white text-2xl font-bold m-auto ml-4 mb-4 mt-4'> Computer</h1>
            <div className="bg-indigo-950 grid grid-cols-5 gap-4  overflow-y-auto overflow-x-hidden ml-4 mr-4 ">
                <div className="col-span-1"><SystemInfo /></div>
                <div className="col-span-1"><MemoryInfo /></div>
                <div className="col-span-1"><KernelModule /></div>
                <div className="col-span-1"><BootInfo /></div>
                <div className="col-span-1"><FileSystems /></div>
                <div className="col-span-1"><Users /></div>
                <div className="col-span-1"><Groups /></div>
            </div>
            <h1 className='text-white text-2xl font-bold m-auto ml-4 mb-4 mt-4'> Devices</h1>
            <div className="bg-indigo-950 grid grid-cols-5 gap-4  overflow-y-auto overflow-x-hidden ml-4 mr-4 ">
                <div className="col-span-1"><Processors /></div>
                <div className="col-span-1"><Gpus /></div>
                <div className="col-span-1"><EnvVariable /></div>
                <div className="col-span-1"><PciDevices /></div>
                <div className="col-span-1"><UsbDevices /></div>
                <div className="col-span-1"><BatteryInfo /></div>
                <div className="col-span-1"><SensorInfo /></div>
                <div className="col-span-1"><InputDevices /></div>
                <div className="col-span-1"><StorageDevices /></div>
            </div>
            <h1 className='text-white text-2xl font-bold m-auto ml-4 mb-4 mt-4'> Network</h1>
            <div className="bg-indigo-950 grid grid-cols-5 gap-4 overflow-y-auto overflow-x-hidden ml-4 mr-4 ">
                <div className="col-span-1"><NetworkInterface /></div>
                <div className="col-span-1"><IpConnections /></div>
                <div className="col-span-1"><RoutingTable /></div>
                <div className="col-span-1"><ArpTable /></div>
                <div className="col-span-1"><DnsServer /></div>
            </div>
        </div>
    );

}

export default Home;