import React, { useEffect, useState } from 'react';
import axios from 'axios';

function EnvVariable() {
    const [envVarInfo, setEnvVarInfo] = useState([]);
    const [isExpanded, setIsExpanded] = useState(false);
    useEffect(() => {
        const fetchMemInfo = () => {
            axios
                .get('http://localhost:5000/environment-variables')
                .then((response) => {
                    console.log('res boot info =  ', response.data.environmentVariables);
                    setEnvVarInfo(response.data.environmentVariables);
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
                <h5 class="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-blue-500">Env Variable Info</h5>
            </a>
            <button
                className="text-blue-500 cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                {isExpanded ? '▼' : '▶'}
            </button>
            
            {isExpanded && envVarInfo ? (
  <div className="text-gray-800 dark:text-white text-left">
    {envVarInfo.map((processor, index) => (
      <div key={index}>
        {Object.entries(processor).map(([key, value], keyIndex) => (
          <div key={keyIndex}>
            {key !== 'times' ? (
              <p>
                <span className="font-semibold text-blue-500">{key}:</span> {value}
              </p>
            ) : (
              <ul>
                {Object.entries(value).map(([timeKey, timeValue], timeIndex) => (
                  <li key={timeIndex}>
                    <span className="font-semibold text-blue-500">{timeKey}:</span> {timeValue}
                  </li>
                ))}
              </ul>
            )}
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

export default EnvVariable;