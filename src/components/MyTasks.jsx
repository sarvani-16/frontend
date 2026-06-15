import React, { useEffect, useRef, useState } from 'react';
import './MyTasks.css';
import ProgressBar from './ProgressBar';
import { apibaseurl, callApi } from '../lib';

const MyTasks = ({ logout }) => {
    const contentDiv = useRef();
    const [isProgress, setIsProgress] = useState(false);
    const [data, setData] = useState(null);
    const [token, setToken] = useState("");
    const [activePage, setActivePage] = useState(0);

    // Submission states
    const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
    const [selectedTaskForSubmit, setSelectedTaskForSubmit] = useState(null);
    const [submissionText, setSubmissionText] = useState("");

    // Role decoding and caching
    const [userRole, setUserRole] = useState(null);
    const [userId, setUserId] = useState(null);
    const [usersCache, setUsersCache] = useState({});

    // Submission preview states (for lead viewing teammate submissions)
    const [showSubmissionPreview, setShowSubmissionPreview] = useState(false);
    const [selectedTaskForPreview, setSelectedTaskForPreview] = useState(null);
    const requestedIds = useRef(new Set());
    const [myTeammates, setMyTeammates] = useState([]);

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

    function fetchUserInfo(id) {
        if (!id || usersCache[id] || requestedIds.current.has(id)) return;
        requestedIds.current.add(id);
        callApi("GET", apibaseurl + "/authservice/getuser/" + id, null, null, (res) => {
            if (res.code === 200 && res.user) {
                setUsersCache(prev => ({ ...prev, [id]: res.user }));
            } else {
                requestedIds.current.delete(id);
            }
        }, token || localStorage.getItem("token"));
    }

    useEffect(() => {
        const storedtoken = localStorage.getItem("token");
        if (storedtoken == undefined || storedtoken == "")
            return logout();

        const decoded = decodeToken(storedtoken);
        if (decoded) {
            setUserRole(decoded.role);
            setUserId(decoded.crid);
        }

        const ps = Math.floor((contentDiv.current?.offsetHeight - 40) / 45) || 10;
        const pageSize = ps > 0 ? ps : 10;
        setToken(storedtoken);
        setIsProgress(true);
        callApi("GET", apibaseurl + "/taskservice/myassignedtasks/1/" + pageSize, null, null, loadData, storedtoken);

        // Fetch user's team members
        callApi("GET", apibaseurl + "/authservice/profile", null, null, (profileRes) => {
            if (profileRes.code === 200 && profileRes.user && profileRes.user[0]) {
                const teamId = profileRes.user[0].teamId;
                if (teamId) {
                    callApi("GET", apibaseurl + "/authservice/assignment/team/members/" + teamId, null, null, (mRes) => {
                        if (mRes.code === 200 && mRes.users) {
                            const mates = mRes.users.filter(u => u.id !== profileRes.user[0].id);
                            setMyTeammates(mates);
                        }
                    }, storedtoken);
                }
            }
        }, storedtoken);
    }, []);

    useEffect(() => {
        if (data?.tasks) {
            data.tasks.forEach(task => {
                if (task.teamLeadId) fetchUserInfo(task.teamLeadId);
                if (task.teamMembers) {
                    task.teamMembers.forEach(mid => fetchUserInfo(mid));
                }
                if (task.assignedto) fetchUserInfo(task.assignedto);
            });
        }
    }, [data, token]);

    function loadTasks(page) {
        const ps = Math.floor((contentDiv.current?.offsetHeight - 40) / 45) || 10;
        const pageSize = ps > 0 ? ps : 10;
        setIsProgress(true);
        setActivePage(page - 1);
        callApi("GET", apibaseurl + "/taskservice/myassignedtasks/" + page + "/" + pageSize, null, null, loadData, token);
    }

    function loadData(res) {
        if (res.code !== 200) {
            alert(res.message);
            setIsProgress(false);
            return;
        }
        setData(res);
        setIsProgress(false);
    }

    function updateStatus(task, newStatus) {
        setIsProgress(true);
        const updatedTask = {
            ...task,
            status: parseInt(newStatus)
        };

        callApi("PUT", apibaseurl + "/taskservice/updatetask/" + task._id, updatedTask, null, (res) => {
            setIsProgress(false);
            if (res.code !== 200) {
                alert(res.message);
                return;
            }
            loadTasks(activePage + 1);
        }, token);
    }

    function openSubmitModal(task) {
        setSelectedTaskForSubmit(task);
        setSubmissionText(task.submission || "");
        setIsSubmitModalOpen(true);
    }

    function handleSubmitDeliverable() {
        if (!selectedTaskForSubmit) return;
        setIsProgress(true);
        const updatedTask = {
            ...selectedTaskForSubmit,
            status: 2, // Marks status as completed
            submission: submissionText
        };

        callApi("PUT", apibaseurl + "/taskservice/updatetask/" + selectedTaskForSubmit._id, updatedTask, null, (res) => {
            setIsProgress(false);
            if (res.code !== 200) {
                alert(res.message);
                return;
            }
            setIsSubmitModalOpen(false);
            setSelectedTaskForSubmit(null);
            setSubmissionText("");
            loadTasks(activePage + 1);
        }, token);
    }

    const getStatusClass = (status) => {
        if (status === 0) return 'status-badge assigned';
        if (status === 1) return 'status-badge in-progress';
        return 'status-badge completed';
    };

    const getStatusText = (status) => {
        if (status === 0) return 'Assigned';
        if (status === 1) return 'In-Progress';
        return 'Completed';
    };

    const openSubmissionPreview = (task) => {
        setSelectedTaskForPreview(task);
        setShowSubmissionPreview(true);
    };

    // Filter tasks based on role-specific views
    const ledTasks = data?.tasks?.filter(t => t.teamLeadId === userId || t.assignedto === userId) || [];
    const teamMemberTasks = data?.tasks?.filter(t => t.teamLeadId === userId && t.teamMembers && t.teamMembers.some(mId => mId !== userId)) || [];

    return (
        <div className='mytasks'>
            <div className='mytasks-header'>
                <label>My Tasks</label>
            </div>
            
            <div className='mytasks-content' ref={contentDiv} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {userRole === 2 ? (
                    // Team Lead View: segment Led tasks from Team member progress
                    <>
                        <h3 style={{ margin: '10px 0', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-glass)', paddingBottom: '8px' }}>My Led Tasks</h3>
                        <table>
                            <thead>
                                <tr>
                                    <th style={{ 'width': '50px' }}>S#</th>
                                    <th style={{ 'width': '180px' }}>Title</th>
                                    <th style={{ 'width': '250px' }}>Description</th>
                                    <th style={{ 'width': '100px' }}>Priority</th>
                                    <th style={{ 'width': '120px' }}>Deadline</th>
                                    <th style={{ 'width': '120px' }}>Status</th>
                                    <th style={{ 'width': '150px' }}>Update Status</th>
                                    <th style={{ 'width': '150px' }}>Deliverables</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ledTasks.length > 0 ? (
                                    ledTasks.map((task, index) => (
                                        <tr key={task._id}>
                                            <td style={{ 'textAlign': 'center' }}>{index + 1}</td>
                                            <td className='task-title'>{task.title}</td>
                                            <td className='task-desc'>{task.description}</td>
                                            <td style={{ 'textAlign': 'center', 'color': task.priority == 0 ? 'var(--primary-color)' : 'var(--red)' }}>
                                                {task.priority == 0 ? 'Normal' : 'High'}
                                            </td>
                                            <td style={{ 'textAlign': 'center' }}>{task.deadline}</td>
                                            <td style={{ 'textAlign': 'center' }}>
                                                <span className={getStatusClass(task.status)}>
                                                    {getStatusText(task.status)}
                                                </span>
                                            </td>
                                            <td style={{ 'textAlign': 'center' }}>
                                                <select 
                                                    className='status-selector'
                                                    value={task.status} 
                                                    onChange={(e) => updateStatus(task, e.target.value)}
                                                >
                                                    <option value={0}>Assigned</option>
                                                    <option value={1}>In-Progress</option>
                                                    <option value={2}>Completed</option>
                                                </select>
                                            </td>
                                            <td style={{ 'textAlign': 'center' }}>
                                                {task.status >= 1 ? (
                                                    <button 
                                                        className='deliverable-btn'
                                                        onClick={() => openSubmitModal(task)}
                                                    >
                                                        {task.submission ? 'Update Work' : 'Submit Work'}
                                                    </button>
                                                ) : (
                                                    <span className='disabled-text'>Start task first</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="8" className="no-tasks">No led tasks assigned to you.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        <h3 style={{ margin: '30px 0 10px 0', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-glass)', paddingBottom: '8px' }}>Teammates' Tasks Progress</h3>
                        <table>
                            <thead>
                                <tr>
                                    <th style={{ 'width': '50px' }}>S#</th>
                                    <th style={{ 'width': '180px' }}>Task Title</th>
                                    <th style={{ 'width': '220px' }}>Description</th>
                                    <th style={{ 'width': '180px' }}>Teammate assigned</th>
                                    <th style={{ 'width': '120px' }}>Deadline</th>
                                    <th style={{ 'width': '120px' }}>Status</th>
                                    <th style={{ 'width': '150px' }}>Submitted Work</th>
                                </tr>
                            </thead>
                            <tbody>
                                {teamMemberTasks.length > 0 ? (
                                    teamMemberTasks.map((task, index) => {
                                        const otherMembers = (task.teamMembers || []).filter(mId => mId !== userId);
                                        return (
                                            <tr key={task._id}>
                                                <td style={{ 'textAlign': 'center' }}>{index + 1}</td>
                                                <td className='task-title'>{task.title}</td>
                                                <td className='task-desc'>{task.description}</td>
                                                <td>
                                                    {otherMembers.map(mId => usersCache[mId]?.fullname || `User ID: ${mId}`).join(", ") || "No members assigned"}
                                                </td>
                                                <td style={{ 'textAlign': 'center' }}>{task.deadline}</td>
                                                <td style={{ 'textAlign': 'center' }}>
                                                    <span className={getStatusClass(task.status)}>
                                                        {getStatusText(task.status)}
                                                    </span>
                                                </td>
                                                <td style={{ 'textAlign': 'center' }}>
                                                    {task.submission ? (
                                                        <button 
                                                            className='deliverable-btn'
                                                            style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}
                                                            onClick={() => openSubmissionPreview(task)}
                                                        >
                                                            View Work
                                                        </button>
                                                    ) : (
                                                        <span className='disabled-text'>No submission yet</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="no-tasks">No team members are assigned tasks under you.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </>
                ) : (
                    // Team Member View (role = 1 or default)
                    <>
                        <table>
                            <thead>
                                <tr>
                                    <th style={{ 'width': '50px' }}>S#</th>
                                    <th style={{ 'width': '150px' }}>Title</th>
                                    <th style={{ 'width': '200px' }}>Description</th>
                                    <th style={{ 'width': '90px' }}>Priority</th>
                                    <th style={{ 'width': '110px' }}>Deadline</th>
                                    <th style={{ 'width': '150px' }}>Team Lead</th>
                                    <th style={{ 'width': '150px' }}>Teammates</th>
                                    <th style={{ 'width': '110px' }}>Status</th>
                                    <th style={{ 'width': '130px' }}>Update Status</th>
                                    <th style={{ 'width': '130px' }}>Deliverables</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data?.tasks && data.tasks.length > 0 ? (
                                    data.tasks.map((task, index) => {
                                        const teammates = (task.teamMembers || []).filter(mId => mId !== userId);
                                        return (
                                            <tr key={task._id}>
                                                <td style={{ 'textAlign': 'center' }}>
                                                    {data.page ? ((data.page - 1) * data.size) + (index + 1) : (index + 1)}
                                                </td>
                                                <td className='task-title'>{task.title}</td>
                                                <td className='task-desc'>{task.description}</td>
                                                <td style={{ 'textAlign': 'center', 'color': task.priority == 0 ? 'var(--primary-color)' : 'var(--red)' }}>
                                                    {task.priority == 0 ? 'Normal' : 'High'}
                                                </td>
                                                <td style={{ 'textAlign': 'center' }}>{task.deadline}</td>
                                                <td>
                                                    {task.teamLeadId ? (usersCache[task.teamLeadId]?.fullname || `User ID: ${task.teamLeadId}`) : "None"}
                                                </td>
                                                <td>
                                                    {myTeammates.map(mate => mate.fullname).join(", ") || "None"}
                                                </td>
                                                <td style={{ 'textAlign': 'center' }}>
                                                    <span className={getStatusClass(task.status)}>
                                                        {getStatusText(task.status)}
                                                    </span>
                                                </td>
                                                <td style={{ 'textAlign': 'center' }}>
                                                    <select 
                                                        className='status-selector'
                                                        value={task.status} 
                                                        onChange={(e) => updateStatus(task, e.target.value)}
                                                    >
                                                        <option value={0}>Assigned</option>
                                                        <option value={1}>In-Progress</option>
                                                        <option value={2}>Completed</option>
                                                    </select>
                                                </td>
                                                <td style={{ 'textAlign': 'center' }}>
                                                    {task.status >= 1 ? (
                                                        <button 
                                                            className='deliverable-btn'
                                                            onClick={() => openSubmitModal(task)}
                                                        >
                                                            {task.submission ? 'Update Work' : 'Submit Work'}
                                                        </button>
                                                    ) : (
                                                        <span className='disabled-text'>Start task first</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="10" className="no-tasks">No tasks assigned to you.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </>
                )}
            </div>

            <div className='mytasks-footer'>
                <div className='pages'>
                    {data?.totalpages && data.totalpages > 1 &&
                        Array.from({ length: data.totalpages }, (_, index) => (
                            <label 
                                key={index} 
                                className={index == activePage ? 'active' : ''} 
                                onClick={() => loadTasks(index + 1)}
                            >
                                {index + 1}
                            </label>
                        ))
                    }
                </div>
            </div>

            {isSubmitModalOpen && (
                <div className='modal-backdrop'>
                    <div className='deliverable-modal'>
                        <div className='modal-header'>
                            <h3>Submit Deliverables</h3>
                            <button className='close-btn' onClick={() => setIsSubmitModalOpen(false)}>&times;</button>
                        </div>
                        <div className='modal-body'>
                            <p><strong>Task:</strong> {selectedTaskForSubmit?.title}</p>
                            <label htmlFor='deliverables-text'>Provide project notes, links, or file paths below:</label>
                            <textarea
                                id='deliverables-text'
                                value={submissionText}
                                onChange={(e) => setSubmissionText(e.target.value)}
                                placeholder="E.g., Finished coding the navbar. Code available at github.com/user/project or folder path /shared/docs/build..."
                                rows={6}
                            />
                        </div>
                        <div className='modal-actions'>
                            <button className='cancel-btn' onClick={() => setIsSubmitModalOpen(false)}>Cancel</button>
                            <button className='submit-btn' onClick={handleSubmitDeliverable}>Submit & Complete</button>
                        </div>
                    </div>
                </div>
            )}

            {showSubmissionPreview && (
                <div className='modal-backdrop'>
                    <div className='deliverable-modal'>
                        <div className='modal-header'>
                            <h3>Teammate Submission</h3>
                            <button className='close-btn' onClick={() => setShowSubmissionPreview(false)}>&times;</button>
                        </div>
                        <div className='modal-body'>
                            <p><strong>Task:</strong> {selectedTaskForPreview?.title}</p>
                            <p><strong>Teammate:</strong> {(selectedTaskForPreview?.teamMembers || []).filter(mId => mId !== userId).map(mId => usersCache[mId]?.fullname || `User ID: ${mId}`).join(", ")}</p>
                            <label>Submitted Deliverables:</label>
                            <div style={{
                                background: 'var(--bg-dark-950)',
                                border: '1px solid var(--border-glass)',
                                borderRadius: '12px',
                                padding: '16px',
                                fontSize: '14px',
                                color: 'var(--text-primary)',
                                whiteSpace: 'pre-wrap',
                                maxHeight: '200px',
                                overflowY: 'auto'
                            }}>
                                {selectedTaskForPreview?.submission || "No notes provided."}
                            </div>
                        </div>
                        <div className='modal-actions'>
                            <button className='submit-btn' onClick={() => setShowSubmissionPreview(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            <ProgressBar isProgress={isProgress} />
        </div>
    );
};

export default MyTasks;
