import React, { useEffect, useState } from 'react';
import './Dashboard.css';
import ProgressBar from './ProgressBar';
import { apibaseurl, callApi, imgurl } from '../lib';

const Dashboard = ({ logout }) => {
    const [token, setToken] = useState("");
    const [isProgress, setIsProgress] = useState(false);
    const [stats, setStats] = useState(null);
    const [recentTasks, setRecentTasks] = useState([]);
    const [teamStats, setTeamStats] = useState({});
    const [usersList, setUsersList] = useState([]);
    const [role, setRole] = useState(1);
    
    // Calendar States
    const [currentDate, setCurrentDate] = useState(new Date());
    const [allTasksForCal, setAllTasksForCal] = useState([]);
    const [selectedDate, setSelectedDate] = useState(null);

    const decodeToken = (t) => {
        if (!t) return null;
        try {
            const base64Url = t.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            return JSON.parse(window.atob(base64));
        } catch (e) {
            return null;
        }
    };

    useEffect(() => {
        const storedtoken = localStorage.getItem("token");
        if (storedtoken == undefined || storedtoken == "")
            return logout();

        setToken(storedtoken);
        setIsProgress(true);
        const decoded = decodeToken(storedtoken);
        const currentUserId = decoded ? decoded.crid : null;

        // Fetch Dashboard stats
        callApi("GET", apibaseurl + "/taskservice/dashboardstats", null, null, (res) => {
            if (res.code !== 200) {
                alert(res.message);
                setIsProgress(false);
                return;
            }
            setStats(res.stats);
            setRole(res.role);
            
            // Determine tasks endpoint for calendar based on role
            const taskEndpoint = res.role == 1 
                ? "/taskservice/myassignedtasks/1/1000" 
                : "/taskservice/getalltasks/1/1000";

            callApi("GET", apibaseurl + taskEndpoint, null, null, (taskRes) => {
                if (taskRes.code === 200 && taskRes.tasks) {
                    setAllTasksForCal(taskRes.tasks);
                }
            }, storedtoken);

            if (res.role == 1) {
                setRecentTasks(res.recentTasks || []);
                setIsProgress(false);
            } else {
                setTeamStats(res.teamStats || {});
                if (res.role == 2 && currentUserId) {
                    // Team Lead: Fetch only their team members
                    callApi("GET", apibaseurl + "/authservice/assignment/teams", null, null, (teamsRes) => {
                        if (teamsRes.code === 200 && teamsRes.teams) {
                            const myTeam = teamsRes.teams.find(t => t.leaderId == currentUserId);
                            if (myTeam) {
                                callApi("GET", apibaseurl + "/authservice/assignment/team/members/" + myTeam.id, null, null, (mRes) => {
                                    if (mRes.code === 200) {
                                        setUsersList(mRes.users || []);
                                    }
                                    setIsProgress(false);
                                }, storedtoken);
                            } else {
                                setUsersList([]);
                                setIsProgress(false);
                            }
                        } else {
                            setUsersList([]);
                            setIsProgress(false);
                        }
                    }, storedtoken);
                } else {
                    // Administrator/Manager: Fetch all users
                    callApi("GET", apibaseurl + "/authservice/getallusers/1/1000", null, null, (userRes) => {
                        if (userRes.code === 200) {
                            setUsersList(userRes.users || []);
                        }
                        setIsProgress(false);
                    }, storedtoken);
                }
            }
        }, storedtoken);
    }, []);

    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const totalDays = new Date(year, month + 1, 0).getDate();
        
        const days = [];
        for (let i = 0; i < firstDay; i++) {
            days.push(null);
        }
        for (let i = 1; i <= totalDays; i++) {
            days.push(new Date(year, month, i));
        }
        return days;
    };

    const handlePrevMonth = () => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
        setSelectedDate(null);
    };

    const handleNextMonth = () => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
        setSelectedDate(null);
    };

    const getTasksForDate = (date) => {
        if (!date) return [];
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const formattedDate = `${year}-${month}-${day}`;
        
        return allTasksForCal.filter(t => {
            if (!t.deadline) return false;
            if (t.deadline === formattedDate) return true;
            try {
                const taskDate = new Date(t.deadline);
                return taskDate.getFullYear() === year &&
                       taskDate.getMonth() === date.getMonth() &&
                       taskDate.getDate() === date.getDate();
            } catch (err) {
                return false;
            }
        });
    };

    const getStatusText = (status) => {
        if (status === 0) return 'Assigned';
        if (status === 1) return 'In-Progress';
        return 'Completed';
    };

    const getPriorityText = (priority) => {
        return priority === 0 ? 'Normal' : 'High';
    };

    return (
        <div className='dashboard'>
            <div className='dashboard-header'>
                <label>Dashboard Overview</label>
                <span className='role-badge'>
                    {role == 3 ? 'Administrator' : role == 2 ? 'Team Lead' : 'Team Member'}
                </span>
            </div>

            {stats && (
                <div className='stats-grid'>
                    <div className='stat-card total'>
                        <div className='stat-info'>
                            <span className='stat-label'>Total Tasks</span>
                            <span className='stat-value'>{stats.total}</span>
                        </div>
                        <img src="/mytask.png" alt='' />
                    </div>
                    <div className='stat-card pending'>
                        <div className='stat-info'>
                            <span className='stat-label'>Assigned</span>
                            <span className='stat-value'>{stats.assigned}</span>
                        </div>
                        <div className='color-indicator assigned'></div>
                    </div>
                    <div className='stat-card progress'>
                        <div className='stat-info'>
                            <span className='stat-label'>In Progress</span>
                            <span className='stat-value'>{stats.inProgress}</span>
                        </div>
                        <div className='color-indicator in-progress'></div>
                    </div>
                    <div className='stat-card done'>
                        <div className='stat-info'>
                            <span className='stat-label'>Completed</span>
                            <span className='stat-value'>{stats.completed}</span>
                        </div>
                        <div className='color-indicator completed'></div>
                    </div>
                </div>
            )}

            <div className='dashboard-content'>
                <div className='main-dashboard-section'>
                    {role == 1 ? (
                        // Regular User Panel: My Focus Tasks
                        <div className='dashboard-panel'>
                            <div className='panel-header'>
                                <h3>My Pending Tasks</h3>
                            </div>
                            <div className='panel-body'>
                                {recentTasks.length === 0 ? (
                                    <p className='empty-message'>No pending tasks. Great job!</p>
                                ) : (
                                    <table className='dashboard-table'>
                                        <thead>
                                            <tr>
                                                <th>Task Title</th>
                                                <th>Priority</th>
                                                <th>Deadline</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {recentTasks.map(task => (
                                                <tr key={task._id}>
                                                    <td className='task-title-cell'>{task.title}</td>
                                                    <td className={`priority-${task.priority === 1 ? 'high' : 'normal'}`}>
                                                        {getPriorityText(task.priority)}
                                                    </td>
                                                    <td>{task.deadline}</td>
                                                    <td className={`status-${task.status}`}>
                                                        {getStatusText(task.status)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    ) : (
                        // Manager / Admin Panel: Team View
                        <div className='dashboard-panel'>
                            <div className='panel-header'>
                                <h3>Team Performance & View</h3>
                            </div>
                            <div className='panel-body'>
                                {usersList.length === 0 ? (
                                    <p className='empty-message'>No team members registered.</p>
                                ) : (
                                    <div className='team-list-grid'>
                                        {usersList.map(user => {
                                            const userTaskData = teamStats[user.id] || { total: 0, completed: 0 };
                                            const completionPercentage = userTaskData.total > 0
                                                ? Math.round((userTaskData.completed / userTaskData.total) * 100)
                                                : 0;

                                            return (
                                                <div key={user.id} className='team-member-card'>
                                                    <div className='member-info'>
                                                        <div className='avatar-wrapper'>
                                                            <img src="/user.png" alt='' />
                                                        </div>
                                                        <div className='member-meta'>
                                                            <span className='member-name'>{user.fullname}</span>
                                                            <span className='member-email'>{user.email}</span>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className='member-tasks-stats'>
                                                        <div className='stats-row'>
                                                            <span>Tasks: <strong>{userTaskData.total}</strong></span>
                                                            <span>Completed: <strong>{userTaskData.completed}</strong></span>
                                                        </div>
                                                        <div className='progress-bar-container'>
                                                            <div 
                                                                className='progress-bar-fill' 
                                                                style={{ width: `${completionPercentage}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className='percentage-text'>{completionPercentage}% Completed</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className='calendar-panel'>
                    <div className='calendar-header'>
                        <h3>Task Calendar</h3>
                        <div className='calendar-nav'>
                            <button onClick={handlePrevMonth}>&lt;</button>
                            <span>{currentDate.toLocaleString('default', { month: 'long' })} {currentDate.getFullYear()}</span>
                            <button onClick={handleNextMonth}>&gt;</button>
                        </div>
                    </div>
                    
                    <div className='calendar-grid'>
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                            <div key={d} className='calendar-weekday'>{d}</div>
                        ))}
                        {getDaysInMonth(currentDate).map((day, idx) => {
                            if (!day) return <div key={`empty-${idx}`} className='calendar-day empty'></div>;
                            
                            const dayTasks = getTasksForDate(day);
                            const isToday = new Date().toDateString() === day.toDateString();
                            const isSelected = selectedDate && selectedDate.toDateString() === day.toDateString();
                            
                            return (
                                <div 
                                    key={day.toISOString()} 
                                    className={`calendar-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${dayTasks.length > 0 ? 'has-tasks' : ''}`}
                                    onClick={() => setSelectedDate(day)}
                                >
                                    <span className='day-number'>{day.getDate()}</span>
                                    {dayTasks.length > 0 && (
                                        <div className='task-dots'>
                                            {dayTasks.slice(0, 3).map((t, tIdx) => (
                                                <span key={t._id || tIdx} className={`dot priority-${t.priority}`}></span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {selectedDate && (
                        <div className='calendar-selected-details'>
                            <h4>Tasks due on {selectedDate.toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })}</h4>
                            {getTasksForDate(selectedDate).length === 0 ? (
                                <p className='no-tasks-text'>No tasks due on this day.</p>
                            ) : (
                                <ul className='calendar-task-list'>
                                    {getTasksForDate(selectedDate).map(t => (
                                        <li key={t._id} className={`task-item priority-${t.priority}`}>
                                            <div className='task-item-header'>
                                                <span className={`status-badge status-${t.status}`}>
                                                    {getStatusText(t.status)}
                                                </span>
                                                <span className={`priority-badge priority-${t.priority}`}>
                                                    {getPriorityText(t.priority)} Priority
                                                </span>
                                            </div>
                                            <div className='task-info'>
                                                <span className='task-title'>{t.title}</span>
                                                <p className='task-desc'>{t.description}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <ProgressBar isProgress={isProgress} />
        </div>
    );
};

export default Dashboard;
