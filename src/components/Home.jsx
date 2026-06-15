import React, { useEffect, useState } from 'react';
import './Home.css';
import { apibaseurl, callApi, imgurl } from '../lib';
import ProgressBar from './ProgressBar';
import Profile from './Profile';
import UserManager from './UserManager';
import TaskManager from './TaskManager';
import Dashboard from './Dashboard';
import MyTasks from './MyTasks';
import Journal from './Journal';

const Home = () => {
    const [fullname, setFullname] = useState("");
    const [isProgress, setIsProgress] = useState("");
    const [token, setToken] = useState("");
    const [menuList, setMenuList] = useState([]);
    const [activeComponent, setActiveComponent] = useState(null);
    const [activeMenu, setActiveMenu] = useState(0);
    const [assignedNotifications, setAssignedNotifications] = useState([]);

    useEffect(()=>{
        const storedtoken = localStorage.getItem("token");
        if(!storedtoken)
            logout();
        else{
            setToken(storedtoken);
            setIsProgress(true);
            callApi("GET", apibaseurl + "/authservice/uinfo", null, null, loadUinfo, storedtoken);
        }
    }, []);

    function loadNotifications(storedToken) {
        callApi("GET", apibaseurl + "/taskservice/myassignedtasks/1/100", null, null, (res) => {
            if (res.code === 200 && res.tasks) {
                const pending = res.tasks.filter(t => t.status === 0);
                setAssignedNotifications(pending);
            }
        }, storedToken);
    }

    function acceptTask(task) {
        setIsProgress(true);
        const updatedTask = {
            ...task,
            status: 1
        };
        callApi("PUT", apibaseurl + "/taskservice/updatetask/" + task._id, updatedTask, null, (res) => {
            setIsProgress(false);
            if (res.code === 200) {
                loadNotifications(token || localStorage.getItem("token"));
                if (activeMenu === 2) {
                    loadModule(2);
                }
            } else {
                alert(res.message);
            }
        }, token || localStorage.getItem("token"));
    }

    function loadUinfo(res){
        setIsProgress(false);
        if(res.code != 200)
            return;
        setFullname(res.fullname);
        setMenuList(res.menulist);
        if (res.menulist && res.menulist.length > 0) {
            loadModule(res.menulist[0].mid);
        }
        loadNotifications(localStorage.getItem("token"));
    }

    function logout(){
        localStorage.clear();
        window.location.replace("/");
    }

    function loadModule(mid){
        setIsProgress(true);
        setActiveMenu(mid);
        const component = {
            1: <Dashboard logout={logout} />,
            2: <MyTasks logout={logout} />,
            3: <TaskManager logout={logout} />,
            4: <UserManager logout={logout} />,
            5: <Profile logout={logout} />,
            6: <Journal logout={logout} />
        };
        setActiveComponent(component[mid]);
        setIsProgress(false);
    }

    return (
        <div className='home'>
            <div className='home-header'>
                <div className='brand-logo'><span>Team</span>Flow</div>
                <div className='info'>
                    {fullname}
                    <img src="/shutdown.png" alt='' onClick={()=>logout()} />
                </div>
            </div>
            {assignedNotifications.length > 0 && (
                <div className='assigned-tasks-banner'>
                    <div className='banner-content'>
                        <div>
                            <span className='pulse-dot'></span>
                            <span>You have <strong>{assignedNotifications.length}</strong> new task(s) assigned.</span>
                        </div>
                        <div className='banner-actions'>
                            <span>Latest task: <strong>{assignedNotifications[0].title}</strong></span>
                            <button onClick={() => acceptTask(assignedNotifications[0])}>Accept & Start</button>
                        </div>
                    </div>
                </div>
            )}
            <div className='home-workspace'>
                <div className='home-menus'>
                    <ul>
                        {menuList.map((m)=>(
                            <li key={m.mid} className={activeMenu==m.mid? 'active': ''} onClick={()=>loadModule(m.mid)}><img src={imgurl + m.icon} alt='' />{m.menu}</li>
                        ))}
                    </ul>
                </div>
                <div className='home-content'>{activeComponent}</div>
            </div>
            <div className='home-footer'>Copyright @ 2026. All rights reserved.</div>

            <ProgressBar isProgress={isProgress}/>
        </div>
    );
}

export default Home;
