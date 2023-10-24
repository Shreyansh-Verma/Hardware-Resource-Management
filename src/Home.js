import { useState } from 'react';
import profile from './img/anime3.png'

function Home() {
    const [isUserMenuOpen, setUserMenuOpen] = useState(false);
    const [isMainMenuOpen, setMainMenuOpen] = useState(false);
    const toggleUserMenu = () => {
        setUserMenuOpen(!isUserMenuOpen);
        // Close the main menu if it's open
        setMainMenuOpen(false);
      };
    
      const toggleMainMenu = () => {
        setMainMenuOpen(!isMainMenuOpen);
        // Close the user menu if it's open
        setUserMenuOpen(false);
      };
    return (
    <div>
    <nav className="bg-white border-gray-200 dark:bg-gray-900">
    <div className="max-w-screen-xl flex flex-wrap  justify-between mx-auto  p-4">
    <div className="flex items-center">
        <span className="self-center text-2xl font-semibold whitespace-nowrap dark:text-white">Code Till Cope</span>
    </div>
    <div className="flex items-center align-center md:order-2">
    <button
        type="button"
        className="flex text-sm bg-gray-800 rounded-full md:mr-0 focus:ring-4 focus:ring-gray-300 dark:focus:ring-gray-600"
        onClick={toggleUserMenu}
      >
        <span className="sr-only">Open user menu</span>
        <img className="w-8 h-8 rounded-full" src={profile} alt="user photo" />
      </button>
      {isUserMenuOpen && (
        <div className="mr-4 absolute right-0 top-12 z-50 text-base list-none bg-white divide-y divide-gray-100 rounded-lg shadow dark:bg-gray-700 dark:divide-gray-600">
          <div className="px-4 py-3">
            <span className="block text-sm text-gray-900 dark:text-white">Bonnie Green</span>
            <span className="block text-sm text-gray-500 truncate dark:text-gray-400">name@flowbite.com</span>
          </div>
          <ul>
            <li>
              <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:hover-bg-gray-600 hover:text-blue-500 dark:text-gray-200 ">
                Dashboard
              </a>
            </li>
            <li>
              <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:hover-bg-gray-600 hover:text-blue-500 dark:text-gray-200 ">
                Settings
              </a>
            </li>
            <li>
              <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:hover-bg-gray-600 hover:text-blue-500 dark:text-gray-200 ">
                Earnings
              </a>
            </li>
            <li>
              <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:hover-bg-gray-600 hover:text-blue-500 dark:text-gray-200 ">
                Sign out
              </a>
            </li>
          </ul>
        </div>
      )}
    </div>

    <div className="items-center justify-between hidden w-full md:flex md:w-auto md:order-1" id="navbar-user">
        <ul className="flex flex-col font-medium p-4 md:p-0 mt-4 border border-gray-100 rounded-lg bg-gray-50 md:flex-row md:space-x-8 md:mt-0 md:border-0 md:bg-white dark:bg-gray-800 md:dark:bg-gray-900 dark:border-gray-700">
        <li>
            <a href="#" className="block py-2 pl-3 pr-4 text-white bg-blue-700 rounded md:bg-transparent md:text-blue-700 md:p-0 md:dark:text-blue-500" aria-current="page">Home</a>
        </li>
        <li>
            <a href="#" className="block py-2 pl-3 pr-4 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:hover:text-blue-700 md:p-0 dark:text-white md:dark:hover:text-blue-500 dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent dark:border-gray-700">About</a>
        </li>
        <li>
            <a href="#" className="block py-2 pl-3 pr-4 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:hover:text-blue-700 md:p-0 dark:text-white md:dark:hover:text-blue-500 dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent dark:border-gray-700">Services</a>
        </li>
        <li>
            <a href="#" className="block py-2 pl-3 pr-4 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:hover:text-blue-700 md:p-0 dark:text-white md:dark:hover:text-blue-500 dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent dark:border-gray-700">Dashboard</a>
        </li>
        <li>
            <a href="#" className="block py-2 pl-3 pr-4 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:hover:text-blue-700 md:p-0 dark:text-white md:dark:hover:text-blue-500 dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent dark:border-gray-700">Contact</a>
        </li>
        </ul>
    </div>
    </div>
    </nav>
    </div>
    );

}

export default Home;
