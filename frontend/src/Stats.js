import React, { useEffect, useState, useRef } from "react";
import Navbar from "./Navbar";
import { Line } from "react-chartjs-2";
import axios from "axios";

const WS_URL = 'wss://dfs-backend.onrender.com';

export const Stats = () => {
  const [agents, setAgents] = useState([]);
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [],
  });
  
  const prevAgentsRef = useRef([]);


  const [updateCounter, setUpdateCounter] = useState(0);


  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get("https://dfs-backend.onrender.com/api/agents");
        const data = response.data;
        prevAgentsRef.current = data.agents;
        setAgents(data.agents); 
        // updateChartData(prevAgentsRef.current); // Update chart data
      } catch (error) {
        console.error("Error fetching agents:", error.message);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 1000); // 3 seconds
    setUpdateCounter((prevCounter) => prevCounter + 1);
    return () => clearInterval(interval);
  }, []);

//   const updateChartData = (data) => {
//     const labels = [];
//     const dataValues = [];
//     console.log("Rec data = ",data);
  
//     if (data.cpu && Array.isArray(data.cpu)) {
//       data.cpu.forEach((cpu) => {
//         labels.push(cpu.model || 'Unknown Model');
//         const idlePercentage = parseFloat(cpu.idlePercentage.replace("%", "")).toFixed(7);
//         dataValues.push(idlePercentage);
//       });
//     } else {
//       console.error('CPU data is missing or not in the expected format.');
//     }
  
//     console.log('Labels:', labels);
//     console.log('Data:', dataValues);
  
//     // Use labels and dataValues as needed for your chart
//   };
  

  return (
    <div className="m-auto bg-indigo-950">
      <Navbar currentTab="Stats" />
      <div className="text-white bg-indigo-950 h-screen">
        <h2>CPU Idle Percentage Live Graph</h2>
        {/* {chartData.labels && chartData.labels.length > 0 ? (
          <Line
          data={chartData}
          options={{
            scales: {
              y: {
                beginAtZero: true, // Ensure the scale starts at zero
              },
            },
          }}
        />
        
        ) : (
          <p>No data available</p>
        )} */}
         {/* <table>
        <thead>
          <tr>
            <th>Model</th>
            <th>Speed</th>
            <th>Idle Percentage</th>
            <th>Is Available</th>
          </tr>
        </thead>
        <tbody>
          {agents.map((item) =>
            item.cpu.map((cpu) => (
              <tr key={cpu._id}>
                <td>{cpu.model}</td>
                <td>{cpu.speed}</td>
                <td>{cpu.idlePercentage}</td>
                <td>{cpu.isAvailable ? "Yes" : "No"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table> */}
      {/* <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                <th scope="col" className="px-6 py-3">
                  Device Name
                </th>


                <th scope="col" className="px-6 py-3">
                  Memory
                </th>

                <th scope="col" className="px-6 py-3">
                  Idle Percentage
                </th>
              </tr>
            </thead>
            <tbody>
              {agents.length && agents.map((agent, index) => (
                <tr key={agent._id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                  <td className="px-6 py-4">{agent.name}</td>


                  <td className="px-6 py-4">
                    {agent.memory}
                  </td>
                      <td className="px-6 py-4">
                      {agent.cpu.map((cpu, cpuIndex) => (
                          <div key={cpuIndex} className="flex flex-col">
                            <span className="px-6 py-4">{cpu.model} - {cpu.idlePercentage} </span>
                          </div>
                        ))}
                      </td>
                </tr>
              ))}
            </tbody>
          </table> */}
            <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th scope="col" className="px-6 py-3">
                Device Name
              </th>
              <th scope="col" className="px-6 py-3">
                Memory
              </th>
              <th scope="col" className="px-6 py-3">
                Idle Percentage
              </th>
            </tr>
          </thead>
          <tbody key={updateCounter}>
            {prevAgentsRef.current.length > 0 && prevAgentsRef.current.map((agent) => (
              <tr key={agent._id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                <td className="px-6 py-4">{agent.name}</td>
                <td className="px-6 py-4">{agent.memory}</td>
                <td className="px-6 py-4">
                  {agent.cpu.map((cpu, cpuIndex) => (
                    <div key={cpuIndex} className="flex flex-col">
                      <span className="px-6 py-1">{cpu.model} - {cpu.idlePercentage}</span>
                    </div>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
