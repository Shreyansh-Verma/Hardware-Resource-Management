import { useState } from 'react';
import profile from './img/anime3.png'
import { Link } from 'react-router-dom';

function Navbar(props) {
  
    const [isUserMenuOpen, setUserMenuOpen] = useState(false);
    const [isMainMenuOpen, setMainMenuOpen] = useState(false);
    
    const active = props?.currentTab ? props?.currentTab : 'Home';
    const [activeTab, setActiveTab] = useState(active);
    const handleTabClick = (tab) => {
      setActiveTab(tab);
    };
    const toggleUserMenu = () => {
        setUserMenuOpen(!isUserMenuOpen);
        setMainMenuOpen(false);
      };
    
      const toggleMainMenu = () => {
        setMainMenuOpen(!isMainMenuOpen);
        setUserMenuOpen(false);
      };
    return (
    <div className='bg-indigo-950'>
    <nav className="bg-white border-gray-200 dark:bg-gray-900 bg-indigo-950">
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
    </div>

    <div className="items-center justify-between hidden w-full md:flex md:w-auto md:order-1" id="navbar-user">
      <ul className="flex flex-col font-medium p-4 md:p-0 mt-4 border border-gray-100 rounded-lg bg-gray-50 md:flex-row md:space-x-8 md:mt-0 md:border-0 md:bg-white dark:bg-gray-800 md:dark:bg-gray-900 dark:border-gray-700">
        <li>
          <Link
            to="/"
            onClick={() => handleTabClick('Home')}
            className={`block py-2 pl-3 pr-4 rounded ${
              activeTab === 'Home'
                ? 'text-blue-700'
                : 'text-gray-900 hover:bg-gray-100 md:hover:bg-transparent md:hover:text-blue-700 md:p-0 dark:text-white md:dark:hover:text-blue-500 dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent dark:border-gray-700'
            }`}
            aria-current={activeTab === 'Home' ? 'page' : null}
          >
            Home
          </Link>
        </li>
        <li>
          <Link
            to="/dashboard"
            onClick={() => handleTabClick('About')}
            className={`block py-2 pl-3 pr-4 rounded ${
              activeTab === 'Dashboard'
                ? 'text-blue-700'
                : 'text-gray-900 hover:bg-gray-100 md:hover:bg-transparent md:hover:text-blue-700 md:p-0 dark:text-white md:dark:hover:text-blue-500 dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent dark:border-gray-700'
            }`}
          >
            Dashboard
          </Link>
        </li>
      </ul>
    </div>  
    </div>
    </nav>
    </div>
    );

}

export default Navbar;
