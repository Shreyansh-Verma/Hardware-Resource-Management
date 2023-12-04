import { useEffect, useState } from "react";
import Navbar from "./Navbar";

export default function Dashboard() {
  const [agents, setAgents] = useState([]);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const response = await fetch("https://dfs-backend.onrender.com/api/agents");
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }

        const data = await response.json();
        console.log('data - ', data.agents);
        setAgents(data.agents); // Assuming the API returns an array of agents
      } catch (error) {
        console.error("Error fetching agents:", error.message);
      }
    };

    fetchAgents();
  }, []); // The empty dependency array ensures the effect runs only once on component mount

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
                  Memory
                </th>
                <th scope="col" className="px-6 py-3">
                  CPU Model
                </th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => (
                <tr key={agent._id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                  <td className="px-6 py-4">{agent.name}</td>
                  <td className="px-6 py-4">{agent.memory}</td>
                  <td className="px-6 py-4">{agent.cpu[0].model}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
