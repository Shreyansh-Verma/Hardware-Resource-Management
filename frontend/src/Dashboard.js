import { useEffect, useState } from "react";
import Navbar from "./Navbar";

export default function Dashboard() {
  const [agents, setAgents] = useState([]);
  const [pressStates, setPressStates] = useState([]);
  const [pressStates2, setPressStates2] = useState([]);


  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const response = await fetch("https://dfs-backend.onrender.com/api/agents");
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }

        const data = await response.json();
        console.log('data - ', data.agents);
        setAgents(data.agents);
        // Initialize press states for each agent, initially set to false
        setPressStates(Array(data.agents.length).fill(false));
      } catch (error) {
        console.error("Error fetching agents:", error.message);
      }
    };

    fetchAgents();
  }, []); // The empty dependency array ensures the effect runs only once on component mount

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
                          <span className="px-6 py-4">Description - {gpu.description}</span>
                          <span className="px-6 py-4">Product - {gpu.product}</span>
                          <span className="px-6 py-4">Vendor - {gpu.vendor}</span>
                        </div>
                      ))}
                        <button className = "bg-transparent hover:bg-blue-500 text-blue-700 font-semibold hover:text-white py-2 px-4 border border-blue-500 hover:border-transparent rounded" 
                      onClick={() => togglePress2(index)}>View Less</button>
                      </>
                    ) : (
                      <div className="flex flex-col">
                        <span className="px-6 py-4">{agent.gpu[0].description}</span>
                        <button className = "bg-transparent hover:bg-blue-500 text-blue-700 font-semibold hover:text-white py-2 px-4 border border-blue-500 hover:border-transparent rounded max-w-[100px]" 
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
                        <button className = "bg-transparent hover:bg-blue-500 text-blue-700 font-semibold hover:text-white py-2 px-4 border border-blue-500 hover:border-transparent rounded" 
                      onClick={() => togglePress(index)}>View Less</button>
                      </>
                    ) : (
                      <div className="flex flex-col">
                        <span className="px-6 py-4">{agent.cpu[0].model} - {agent.cpu[0].speed}</span>
                        <button className = "bg-transparent hover:bg-blue-500 text-blue-700 font-semibold hover:text-white py-2 px-4 border border-blue-500 hover:border-transparent rounded max-w-[100px]" 
                        onClick={() => togglePress(index)}>View All</button>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                      {agent.memory}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
