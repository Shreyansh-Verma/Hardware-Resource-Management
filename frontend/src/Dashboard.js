import { useEffect, useState, useRef } from "react";
import Navbar from "./Navbar";
import FileUploader from "./FileUploader";
import useWebSocket from 'react-use-websocket';
import FileSaver from "file-saver";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FaCheckCircle } from "react-icons/fa";
import axios from "axios";

const WS_URL = 'wss://dfs-backend.onrender.com';

export default function Dashboard() {
  const notify = (sys) => toast(`File Executed Successfully on ${sys}`);
  const notify2 = () => toast(`No system loaded yet.`);
  const notify3 = () => toast(`Systems Loaded Successfully.`);
  const notify4 = (sys) => toast(`${sys} Deallocated Successfully.`);
  const notify5 = (sys) => toast(`Error in Deallocating ${sys}.`);



  const [agents, setAgents] = useState([]);
  const [pressStates, setPressStates] = useState([]);
  const [pressStates2, setPressStates2] = useState([]);
  const [clientId, setClientId] = useState(null);
  const [dataReceived, setDataReceived] = useState(false);
  const [fileName, setFilename] = useState('');
  const [recData, setRecData] = useState('');
  const [machine, setMachine] = useState('');
  const notify3Called = useRef(false);
  const notify2Called = useRef(false);


  const { sendJsonMessage } = useWebSocket(WS_URL, {
    onOpen: () => {
      console.log('WebSocket connection established.');
    },
    onMessage: (event) => {
      const data = JSON.parse(event.data);

      const blob = new Blob([data.fileContent], { type: "text/plain;charset=utf-8" });
      const uniqueFilename = `output_${Date.now()}_${Math.random().toString(36).substring(2, 10)}.txt`;

      if(data.machine){
        setMachine(data.machine);
      }
      if (data.fileContent) {
        notify(machine);
        setRecData(data.fileContent);
        setFilename(uniqueFilename);
        setDataReceived(true);
        FileSaver.saveAs(blob, uniqueFilename);
      }
      if (data.task && data.task.clientId) {
        setClientId(data.task.clientId);
        console.log('Received clientId from the server:', data.task.clientId);
      }
    },
  });

  useEffect(() => {
    const fetchData = () => {
      fetch("https://dfs-backend.onrender.com/api/agents")
        .then((response) => {
          if (!response.ok) {
            notify2();
            throw new Error("Network response was not ok");
          }
          return response.json();
        })
        .then((data) => {
          if(data.agents.length > 0 && !notify3Called.current){
            notify3Called.current = true;
            notify3();
          }
          else if(data.agents.length === 0 && !notify2Called.current){
            notify2Called.current = true;
            notify2();
          }
          const updatedAgents = data.agents.map((agent) => {
            const lastFetchedTime = new Date(agent.lastFetched).getTime();
            const currentTime = new Date().getTime();
            const timeDifferenceInSeconds = (currentTime - lastFetchedTime) / 1000; // Convert milliseconds to seconds

            return {
              ...agent,
              isHealthy: timeDifferenceInSeconds <= 90, // true if within 90 seconds, otherwise false
            };
          });

          console.log('Updated data agents - ', updatedAgents);
          setAgents(updatedAgents);
          setPressStates(Array(data.agents.length).fill(false));
        })
        .catch((error) => {
          console.error("Error fetching agents:", error.message);
        });
    };
    fetchData();
    const interval = setInterval(fetchData, 3000); // 30 seconds
  
    // Clean up the interval to avoid memory leaks
    return () => clearInterval(interval);
  }, []); // Empty dependency array to run this effect only once on mount
  

  const togglePress = (index) => {
    setPressStates((prevPressStates) => {
      const newPressStates = [...prevPressStates];
      newPressStates[index] = !newPressStates[index];
      return newPressStates;
    });
  };
  const togglePress2 = (index) => {
    setPressStates2((prevPressStates) => {
      const newPressStates = [...prevPressStates];
      newPressStates[index] = !newPressStates[index];
      return newPressStates;
    });
  };

  const deallocate = (name) => {
    axios.post('https:///dfs-backend.onrender.com/deallocate', {name: name} )
    .then((res) => {
        notify4(name);
        console.log('reg - ', res);
    })
    .catch((err)=> {
        notify5(name);
    });
  };
  return (
    <div className="m-auto bg-indigo-950">
      <Navbar currentTab="Dashboard" />
      <div className="text-white bg-indigo-950 h-screen">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                <th scope="col" className="px-6 py-3">
                  Device Name
                </th>
                <th scope="col" className="px-6 py-3">
                  GPU
                </th>
                <th scope="col" className="px-6 py-3">
                  CPU
                </th>
                <th scope="col" className="px-6 py-3">
                  Memory
                </th>
                <th scope="col" className="px-6 py-3">
                  CPU Health
                </th>
                <th scope="col" className="px-6 py-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent, index) => (
                <tr key={agent._id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                  <td className="px-6 py-4">{agent.name}</td>
                  <td className="px-6 py-4">
                    {pressStates2[index] == false ? (
                      <>
                        {agent.gpu.map((gpu, cpuIndex) => (
                          <div key={cpuIndex} className="flex flex-col">
                            <span className="px-6 py-4"> Description - {gpu.description}</span>
                            <span className="px-6 py-4"> Product - {gpu.product}</span>
                            <span className="px-6 py-4"> Vendor - {gpu.vendor}</span>
                          </div>
                        ))}
                        <button className="bg-transparent hover:bg-blue-500 text-blue-700 font-semibold hover:text-white py-2 px-4 border border-blue-500 hover:border-transparent rounded"
                          onClick={() => togglePress2(index)}>View Less</button>
                      </>
                    ) : (
                      <div className="flex flex-col">
                        <span className="px-6 py-4">{agent?.gpu[0]?.description}</span>
                        <button className="bg-transparent hover:bg-blue-500 text-blue-700 font-semibold hover:text-white py-2 px-4 border border-blue-500 hover:border-transparent rounded max-w-[100px]"
                          onClick={() => togglePress2(index)}>View All</button>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {pressStates[index] ? (
                      <>
                        {agent.cpu.map((cpu, cpuIndex) => (
                          <div key={cpuIndex} className="flex flex-col">
                            <span className="px-6 py-4">{cpu.model} - {cpu.speed}</span>
                          </div>
                        ))}
                        <button className="bg-transparent hover:bg-blue-500 text-blue-700 font-semibold hover:text-white py-2 px-4 border border-blue-500 hover:border-transparent rounded"
                          onClick={() => togglePress(index)}>View Less</button>
                      </>
                    ) : (
                      <div className="flex flex-col">
                        <span className="px-6 py-4">{agent.cpu[0].model} - {agent.cpu[0].speed}</span>
                        <button className="bg-transparent hover:bg-blue-500 text-blue-700 font-semibold hover:text-white py-2 px-4 border border-blue-500 hover:border-transparent rounded max-w-[100px]"
                          onClick={() => togglePress(index)}>View All</button>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {agent.memory}
                  </td>
                      <td className="px-6 py-4">
                        {agent.isHealthy ? <FaCheckCircle className="text-green-500 text-2xl" /> : 'Unhealthy'}
                      </td>
                      <td className="px-6 py-4">
                      <button className="bg-transparent hover:bg-red-500 text-red-700 font-semibold hover:text-white py-2 px-4 border border-red-500 hover:border-transparent rounded"
                          onClick={() => deallocate(agent.name)}>Deallocate</button>
                      </td>
                </tr>
              ))}
            </tbody>
          </table>

        </div>
        <div className="text-center">
          <h1 className="text-lg mb-4 mt-4">Run your scripts by uploading file</h1>
          <FileUploader
            clientId={clientId}
          />
        </div>
        {dataReceived && (
          <div className="text-center mt-4">
            <a
              href={`data:text/plain;charset=utf-8,${recData}`}
              download={`${fileName}`}
            >
              <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                Download Received Data
              </button>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
