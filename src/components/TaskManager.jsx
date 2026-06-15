import React, { useEffect, useRef, useState } from 'react';
import './TaskManager.css';
import ProgressBar from './ProgressBar';
import { apibaseurl, callApi, imgurl } from '../lib';

const TaskManager = ({logout}) => {
    const contentDiv = useRef();
    const tsktitle = useRef();
    const vs = useRef();
    const [isProgress, setIsProgress] = useState(false);
    const [data, setData] = useState(null);
    const [token, setToken] = useState("");
    const [activePage, setActivePage] = useState(0);
    const [showPopup, setShowPopup] = useState(false);
    const [taskData, setTaskData] = useState(null);
    const [errorData, setErrorData] = useState(null);

    const [showDropdown, setShowDropdown] = useState(false);
    const [options, setOptions] = useState([]);
    const [searchvalue, setSearchValue] = useState("");
    const [highlightIndex, setHighlightIndex] = useState(-1);

    const [vectorSearch, setVectorSearch] = useState("");

    // Submission preview states
    const [showSubmissionPreview, setShowSubmissionPreview] = useState(false);
    const [selectedTaskForPreview, setSelectedTaskForPreview] = useState(null);

    // Multi-role custom states
    const [userRole, setUserRole] = useState(null);
    const [userId, setUserId] = useState(null);
    const [teamRoster, setTeamRoster] = useState([]);
    const [ledTeamId, setLedTeamId] = useState(null);

    const [numMembers, setNumMembers] = useState(0);
    const [teamLeadSearch, setTeamLeadSearch] = useState("");
    const [memberSearches, setMemberSearches] = useState(["", "", "", "", ""]);
    const [selectedTeamLead, setSelectedTeamLead] = useState(null);
    const [selectedMembers, setSelectedMembers] = useState([null, null, null, null, null]);
    const [activeDropdown, setActiveDropdown] = useState(null); // 'lead' or index 0..4

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

        const decoded = decodeToken(storedtoken);
        if (decoded) {
            setUserRole(decoded.role);
            setUserId(decoded.crid);
        }

        const ps = Math.floor((contentDiv.current.offsetHeight - 40) / 40);
        setToken(storedtoken);
        setIsProgress(true);
        callApi("GET", apibaseurl + "/taskservice/getalltasks/1/" + ps, null, null, loadData, storedtoken);
    }, []);

    useEffect(() => {
        if (token && userRole === 2 && userId) {
            // Find Team Lead's team by fetching teams
            callApi("GET", apibaseurl + "/authservice/assignment/teams", null, null, (res) => {
                if (res.code === 200 && res.teams) {
                    const myTeam = res.teams.find(t => t.leaderId === userId);
                    if (myTeam) {
                        setLedTeamId(myTeam.id);
                        // Fetch team members
                        callApi("GET", apibaseurl + "/authservice/assignment/team/members/" + myTeam.id, null, null, (mRes) => {
                            if (mRes.code === 200 && mRes.users) {
                                setTeamRoster(mRes.users);
                            }
                        }, token);
                    }
                }
            }, token);
        }
    }, [token, userRole, userId]);

    function loadTasks(page){
        const ps = Math.floor((contentDiv.current.offsetHeight - 40) / 40);
        setIsProgress(true);
        setActivePage(page - 1);
        callApi("GET", apibaseurl + "/taskservice/getalltasks/" + page + "/" + ps, null, null, loadData, token);
    }

    function loadData(res){
        if(res.code !== 200){
            alert(res.message);
            setIsProgress(false);
            return;
        }
        setData(res);
        setIsProgress(false);
    }

    function addTask(){
        setIsProgress(true);
        setErrorData(null);
        setTaskData({
            id: "",
            title: "",
            description: "",
            createdby: 0,
            assignedto: "",
            teamLeadId: 0,
            teamMembers: [],
            priority: 0,
            deadline: "",
            status: 0,
        });
        setNumMembers(0);
        setTeamLeadSearch("");
        setMemberSearches(["", "", "", "", ""]);
        setSelectedTeamLead(null);
        setSelectedMembers([null, null, null, null, null]);
        setOptions([]);
        setShowPopup(true);
        setTimeout(() => {tsktitle.current?.focus();}, 0);
        setIsProgress(false);
    }

    function handleInput(e){
        const {name, value} = e.target;
        setTaskData({...taskData, [name] : value});
    }

    // Recommendations for Team Lead (role = 2)
    function loadLeadRecommendations() {
        const title = taskData?.title || "";
        const desc = taskData?.description || "";
        setIsProgress(true);
        callApi("GET", apibaseurl + "/taskservice/recommendusers?title=" + encodeURIComponent(title) + "&description=" + encodeURIComponent(desc) + "&role=2", null, null, (res) => {
            setIsProgress(false);
            if (res.code === 200) {
                setOptions(res.users);
                setShowDropdown(res.users.length > 0);
                setActiveDropdown('lead');
            }
        }, token);
    }

    function searchLead(val) {
        setTeamLeadSearch(val);
        if (val.length === 0) {
            setSelectedTeamLead(null);
            loadLeadRecommendations();
            return;
        }
        if (val.length % 2 === 0) {
            callApi("GET", apibaseurl + "/authservice/searchuser/" + val, null, null, (res) => {
                if (res.code === 200) {
                    const filtered = res.users.filter(u => u.role === 2);
                    setOptions(filtered);
                    setShowDropdown(filtered.length > 0);
                    setActiveDropdown('lead');
                }
            }, token);
        }
    }

    function handleSelectLead(user) {
        setSelectedTeamLead(user);
        setTeamLeadSearch(user.fullname + " (" + user.email + ")");
        setTaskData(prev => ({
            ...prev,
            teamLeadId: user.id,
            assignedto: user.id
        }));
        setShowDropdown(false);
        setActiveDropdown(null);
    }

    // Recommendations for Team Members (role = 1)
    function loadMemberRecommendations(index) {
        const title = taskData?.title || "";
        const desc = taskData?.description || "";
        setIsProgress(true);
        callApi("GET", apibaseurl + "/taskservice/recommendusers?title=" + encodeURIComponent(title) + "&description=" + encodeURIComponent(desc) + "&role=1", null, null, (res) => {
            setIsProgress(false);
            if (res.code === 200) {
                setOptions(res.users);
                setShowDropdown(res.users.length > 0);
                setActiveDropdown(index);
            }
        }, token);
    }

    function searchMember(index, val) {
        const newSearches = [...memberSearches];
        newSearches[index] = val;
        setMemberSearches(newSearches);
        if (val.length === 0) {
            const newSelected = [...selectedMembers];
            newSelected[index] = null;
            setSelectedMembers(newSelected);
            loadMemberRecommendations(index);
            return;
        }
        if (val.length % 2 === 0) {
            callApi("GET", apibaseurl + "/authservice/searchuser/" + val, null, null, (res) => {
                if (res.code === 200) {
                    const filtered = res.users.filter(u => u.role === 1);
                    setOptions(filtered);
                    setShowDropdown(filtered.length > 0);
                    setActiveDropdown(index);
                }
            }, token);
        }
    }

    function handleSelectMember(index, user) {
        const newSelected = [...selectedMembers];
        newSelected[index] = user;
        setSelectedMembers(newSelected);

        const newSearches = [...memberSearches];
        newSearches[index] = user.fullname + " (" + user.email + ")";
        setMemberSearches(newSearches);

        setShowDropdown(false);
        setActiveDropdown(null);
    }

    function validateData(){
        let errors = {};
        if(!taskData?.title || taskData.title === "") errors.title = true;
        if(!taskData?.description || taskData.description === "") errors.description = true;
        if(!taskData?.deadline || taskData.deadline === "") errors.deadline = true;
        
        if (userRole === 3) {
            if (!taskData?.teamLeadId) errors.teamLeadId = true;
            for (let i = 0; i < numMembers; i++) {
                if (!selectedMembers[i]) {
                    errors[`member_${i}`] = true;
                }
            }
        } else if (userRole === 2) {
            if (!taskData?.assignedto) errors.assignedto = true;
        } else {
            if (searchvalue === "") errors.assignedto = true;
        }
        setErrorData(errors);
        return Object.keys(errors).length > 0;
    }

    function saveTask(){
        if(validateData())
            return;

        setIsProgress(true);
        const payloadTask = { ...taskData };
        if (userRole === 3) {
            payloadTask.assignedto = payloadTask.teamLeadId;
            payloadTask.teamMembers = selectedMembers.slice(0, numMembers).filter(m => m !== null).map(m => m.id);
        } else if (userRole === 2) {
            payloadTask.teamLeadId = userId;
            payloadTask.teamMembers = [parseInt(payloadTask.assignedto)];
        }

        if(taskData?.id === "")
            callApi("POST", apibaseurl + "/taskservice/createtask", payloadTask, null, saveTaskHandler, token);
        else
            callApi("PUT", apibaseurl + "/taskservice/updatetask/" + taskData?._id, payloadTask, null, saveTaskHandler, token);
    }

    function saveTaskHandler(res){
        alert(res.message);
        setIsProgress(false);
        if(res.code !== 200)      
            return;

        setShowPopup(false);
        setTaskData(null);
        loadTasks(activePage + 1);
    }

    function vSearch(){
        if(vectorSearch.length === 0)
            loadTasks(1);
        else{
            setIsProgress(true);
            callApi("GET", apibaseurl + "/taskservice/vectorsearch/" + vectorSearch, null, null, loadData, token);
        }
    }

    function editTask(id){
        setIsProgress(true);
        setErrorData(null);
        callApi("GET", apibaseurl + "/taskservice/gettask/" + id, null, null, editTaskHandler, token);
    }

    function editTaskHandler(res){
        if(res.code !== 200){
            alert(res.message);
            setIsProgress(false);
            return;
        }
        const task = res.task;
        setTaskData(task);
        
        // Fetch Team Lead details
        const leadId = task.teamLeadId || task.assignedto;
        if (leadId) {
            callApi("GET", apibaseurl + "/authservice/getuser/" + leadId, null, null, (leadRes) => {
                if (leadRes.code === 200 && leadRes.user) {
                    setSelectedTeamLead(leadRes.user);
                    setTeamLeadSearch(leadRes.user.fullname + " (" + leadRes.user.email + ")");
                }
            }, token);
        } else {
            setSelectedTeamLead(null);
            setTeamLeadSearch("");
        }

        // Fetch Members details
        const membersList = task.teamMembers || [];
        setNumMembers(membersList.length);
        const newSelectedMembers = [null, null, null, null, null];
        const newMemberSearches = ["", "", "", "", ""];
        
        if (membersList.length > 0) {
            let loadedCount = 0;
            membersList.forEach((memberId, idx) => {
                callApi("GET", apibaseurl + "/authservice/getuser/" + memberId, null, null, (memRes) => {
                    if (memRes.code === 200 && memRes.user) {
                        newSelectedMembers[idx] = memRes.user;
                        newMemberSearches[idx] = memRes.user.fullname + " (" + memRes.user.email + ")";
                    }
                    loadedCount++;
                    if (loadedCount === membersList.length) {
                        setSelectedMembers(newSelectedMembers);
                        setMemberSearches(newMemberSearches);
                        setShowPopup(true);
                        setIsProgress(false);
                    }
                }, token);
            });
        } else {
            setSelectedMembers(newSelectedMembers);
            setMemberSearches(newMemberSearches);
            setShowPopup(true);
            setIsProgress(false);
        }
    }

    function deleteTask(id){
        const resp = confirm("Click OK to delete");
        if(!resp)
            return;

        setIsProgress(true);
        callApi("DELETE", apibaseurl + "/taskservice/deletetask/" + id, null, null, deleteTaskHandler, token);
    }

    function deleteTaskHandler(res){
        alert(res.message);
        setShowPopup(false);
        loadTasks(activePage + 1);
    }

    function openSubmissionPreview(task) {
        setSelectedTaskForPreview(task);
        setShowSubmissionPreview(true);
    }

    return (
        <div className='tmanager'>
            <div className='tmanager-header'>
                <label>Task Manager</label>
                <div>
                    <label>Vector Search</label>
                    <input type='text' ref={vs} autoComplete='off' name='vectorSearch' value={vectorSearch} onChange={(e)=>setVectorSearch(e.target.value)} />
                    <button onClick={()=>vSearch()}>Search</button>
                </div>
            </div>
            <div className='tmanager-content' ref={contentDiv}>
                <table>
                    <thead>
                        <tr>
                            <th style={{'width':'50px'}}>S#</th>
                            <th style={{'width':'180px'}}>Title</th>
                            <th style={{'width':'220px'}}>Description</th>
                            <th style={{'width':'90px'}}>Priority</th>
                            <th style={{'width':'100px'}}>Deadline</th>
                            <th style={{'width':'100px'}}>Status</th>
                            {data?.tasks?.some(task => task.score !== undefined) && <th style={{'width':'110px'}}>Relevance</th>}
                            <th style={{'width':'220px'}}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data?.tasks.map((task, index)=>(
                            <tr key={task._id}>
                                <td style={{'text-align':'center'}}>{data.page ? ((data.page - 1) * data.size) + (index + 1) : (index + 1)}</td>
                                <td>{task.title}</td>
                                <td>{task.description}</td>
                                <td style={{'text-align':'center', 'color': task.priority == 0 ? 'var(--primary-color)' : 'var(--red)'}}>{task.priority == 0 ? 'Normal' : 'High'}</td>
                                <td style={{'text-align':'center'}}>{task.deadline}</td>
                                <td style={{'text-align':'center', 'color': task.status == 0 ? 'var(--text-dark)' : task.status == 1 ? 'var(--maroon)' : 'var(--secondary-color)'}}>{task.status == 0 ? 'Assigned' : task.status == 1 ? 'In-Progress' : 'Completed'}</td>
                                {task.score !== undefined && (
                                    <td style={{'text-align':'center'}}>
                                        <span className="score-badge" style={{
                                            display: 'inline-block',
                                            padding: '4px 8px',
                                            borderRadius: '12px',
                                            fontSize: '0.8rem',
                                            fontWeight: '600',
                                            background: task.score >= 0.7 ? 'rgba(74, 222, 128, 0.15)' : task.score >= 0.4 ? 'rgba(250, 204, 21, 0.15)' : 'rgba(248, 113, 113, 0.1)',
                                            color: task.score >= 0.7 ? '#4ade80' : task.score >= 0.4 ? '#facc15' : '#f87171',
                                            border: task.score >= 0.7 ? '1px solid rgba(74, 222, 128, 0.3)' : task.score >= 0.4 ? '1px solid rgba(250, 204, 21, 0.3)' : '1px solid rgba(248, 113, 113, 0.2)'
                                        }}>
                                            {Math.round(task.score * 100)}% Match
                                        </span>
                                    </td>
                                )}
                                <td>
                                    <div className="action-cell">
                                        {task.submission ? (
                                            <button 
                                                className="view-submission-btn"
                                                onClick={() => openSubmissionPreview(task)}
                                            >
                                                View Work
                                            </button>
                                        ) : null}
                                        <img src={imgurl + "edit.png"} alt='' onClick={()=>editTask(task._id)} />
                                        <img src={imgurl + "delete.png"} alt='' onClick={()=>deleteTask(task._id)} />
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className='tmanager-footer'>
                <button onClick={()=>addTask()}>Add New</button>
                <div className='pages'>{
                    Array.from({ length: data?.totalpages}, (_, index) => (
                        <label key={index} className={index == activePage? 'active': ''} onClick={()=>loadTasks(index + 1)}>
                            {index + 1}
                        </label>
                    ))
                }</div>
            </div>

            {showPopup && 
                <div className='overlay'>
                    <div className='popup' style={{ maxHeight: '90vh', overflowY: 'auto' }}>
                        <span className='close' onClick={()=>setShowPopup(false)}>&times;</span>
                        <h3>{taskData?.id == "" ? "New Task" : "Update Task"}</h3>
                        <label>Task Title*</label>
                        <input type='text' ref={tsktitle} className={errorData?.title ? 'error' : ''} autoComplete='off' name='title' value={taskData?.title} onChange={(e)=>handleInput(e)} />
                        <label>Description*</label>
                        <textarea rows="2" className={errorData?.description ? 'error' : ''} name='description' value={taskData?.description} onChange={(e)=>handleInput(e)}></textarea>
                        
                        {userRole === 3 ? (
                            <>
                                <label>Team Lead*</label>
                                <div className="dropdown">
                                    <input 
                                        type="text" 
                                        autoComplete="off" 
                                        className={errorData?.teamLeadId ? 'error' : ''} 
                                        placeholder="Search Team Lead..."
                                        value={teamLeadSearch} 
                                        onChange={(e) => searchLead(e.target.value)} 
                                        onFocus={() => loadLeadRecommendations()}
                                        onBlur={() => setTimeout(() => { setShowDropdown(false); setActiveDropdown(null); }, 250)}
                                    />
                                    {showDropdown && activeDropdown === 'lead' && 
                                        <ul>
                                            {options.map((item, index) => (
                                                <li 
                                                    key={item.id} 
                                                    onMouseDown={() => handleSelectLead(item)} 
                                                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '8px 12px', gap: '2px', borderBottom: '1px solid var(--border-glass)' }}
                                                >
                                                    <div style={{ fontWeight: '600' }}>{item.fullname} ({item.email})</div>
                                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                                        Skills: {item.skills || 'None'} {item.score !== undefined && <span style={{ color: 'var(--primary-color)', fontWeight: '600', marginLeft: '6px' }}>({Math.round(item.score * 100)}% Match)</span>}
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    }
                                </div>

                                <label>Number of Team Members*</label>
                                <select 
                                    value={numMembers} 
                                    onChange={(e) => setNumMembers(parseInt(e.target.value))}
                                >
                                    {[0, 1, 2, 3, 4, 5].map(n => (
                                        <option key={n} value={n}>{n}</option>
                                    ))}
                                </select>

                                {Array.from({ length: numMembers }).map((_, idx) => (
                                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <label>Team Member {idx + 1}*</label>
                                        <div className="dropdown">
                                            <input 
                                                type="text" 
                                                autoComplete="off" 
                                                className={errorData?.[`member_${idx}`] ? 'error' : ''} 
                                                placeholder={`Search Team Member ${idx + 1}...`}
                                                value={memberSearches[idx] || ""} 
                                                onChange={(e) => searchMember(idx, e.target.value)} 
                                                onFocus={() => loadMemberRecommendations(idx)}
                                                onBlur={() => setTimeout(() => { setShowDropdown(false); setActiveDropdown(null); }, 250)}
                                            />
                                            {showDropdown && activeDropdown === idx && 
                                                <ul>
                                                    {options.map((item, index) => (
                                                        <li 
                                                            key={item.id} 
                                                            onMouseDown={() => handleSelectMember(idx, item)} 
                                                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '8px 12px', gap: '2px', borderBottom: '1px solid var(--border-glass)' }}
                                                        >
                                                            <div style={{ fontWeight: '600' }}>{item.fullname} ({item.email})</div>
                                                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                                                Skills: {item.skills || 'None'} {item.score !== undefined && <span style={{ color: 'var(--primary-color)', fontWeight: '600', marginLeft: '6px' }}>({Math.round(item.score * 100)}% Match)</span>}
                                                            </div>
                                                        </li>
                                                    ))}
                                                </ul>
                                            }
                                        </div>
                                    </div>
                                ))}
                            </>
                        ) : userRole === 2 ? (
                            <>
                                <label>Assigned To (Your Team Members)*</label>
                                <select 
                                    className={errorData?.assignedto ? 'error' : ''} 
                                    name='assignedto' 
                                    value={taskData?.assignedto || ""} 
                                    onChange={(e) => {
                                        const selectedId = parseInt(e.target.value);
                                        setTaskData({
                                            ...taskData,
                                            assignedto: selectedId,
                                            teamLeadId: userId,
                                            teamMembers: [selectedId]
                                        });
                                    }}
                                >
                                    <option value="">-- Select Team Member --</option>
                                    {teamRoster.map(member => (
                                        <option key={member.id} value={member.id}>
                                            {member.fullname} ({member.email})
                                        </option>
                                    ))}
                                </select>
                            </>
                        ) : (
                            <>
                                <label>Assigned To*</label>
                                <div className="dropdown">
                                    <input 
                                        type="text" 
                                        autoComplete="off" 
                                        className={errorData?.assignedto ? 'error' : ''} 
                                        name='assignedto' 
                                        value={searchvalue} 
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setSearchValue(val);
                                            if (val.length === 0) {
                                                setTaskData({ ...taskData, assignedto: "" });
                                                return;
                                            }
                                            if (val.length % 2 === 0) {
                                                callApi("GET", apibaseurl + "/authservice/searchuser/" + val, null, null, (res) => {
                                                    setOptions(res.users);
                                                    setShowDropdown(res.users.length > 0);
                                                    setActiveDropdown('legacy');
                                                }, token);
                                            }
                                        }} 
                                        onFocus={() => {
                                            const title = taskData?.title || "";
                                            const desc = taskData?.description || "";
                                            callApi("GET", apibaseurl + "/taskservice/recommendusers?title=" + encodeURIComponent(title) + "&description=" + encodeURIComponent(desc), null, null, (res) => {
                                                if (res.code === 200) {
                                                    setOptions(res.users);
                                                    setShowDropdown(res.users.length > 0);
                                                    setActiveDropdown('legacy');
                                                }
                                            }, token);
                                        }}
                                        onBlur={() => setTimeout(() => { setShowDropdown(false); setActiveDropdown(null); }, 250)}
                                    />
                                    {showDropdown && activeDropdown === 'legacy' && 
                                        <ul>
                                            {options.map((item, index) => (
                                                <li 
                                                    key={item.id} 
                                                    onMouseDown={() => {
                                                        setSearchValue(item.fullname + " (" + item.email + ")");
                                                        setTaskData({ ...taskData, assignedto: item.id });
                                                        setShowDropdown(false);
                                                        setActiveDropdown(null);
                                                    }} 
                                                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '8px 12px', gap: '2px', borderBottom: '1px solid var(--border-glass)' }}
                                                >
                                                    <div style={{ fontWeight: '600' }}>{item.fullname} ({item.email})</div>
                                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                                        Skills: {item.skills || 'None'} {item.score !== undefined && <span style={{ color: 'var(--primary-color)', fontWeight: '600', marginLeft: '6px' }}>({Math.round(item.score * 100)}% Match)</span>}
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    }
                                </div>
                            </>
                        )}

                        <label>Priority*</label>
                        <select className={errorData?.priority ? 'error' : ''} name='priority' value={taskData?.priority} onChange={(e)=>handleInput(e)}>
                            <option value={0}>Normal</option>
                            <option value={1}>High</option>
                        </select>
                        <label>Deadline (mm/dd/yyyy)*</label>
                        <input type='date' style={{"height": "33px"}} className={errorData?.deadline ? 'error' : ''} autoComplete='off' name='deadline' value={taskData?.deadline} onChange={(e)=>handleInput(e)} />
                        <label>Task Status*</label>
                        <select className={errorData?.status ? 'error' : ''} name='status' value={taskData?.status} onChange={(e)=>handleInput(e)}>
                            <option value={0}>Assigned</option>
                            <option value={1}>In-Progress</option>
                            <option value={2}>Completed</option>
                        </select>
                        <button onClick={()=>saveTask()}>{taskData?.id == "" ? "Save" : "Update"}</button>
                    </div>
                </div>
            }

            {showSubmissionPreview && 
                <div className='overlay'>
                    <div className='popup submission-preview-popup'>
                        <span className='close' onClick={()=>setShowSubmissionPreview(false)}>&times;</span>
                        <h3>Task Submission</h3>
                        <div className='submission-info-row'>
                            <strong>Task Title:</strong> <span>{selectedTaskForPreview?.title}</span>
                        </div>
                        <div className='submission-info-row' style={{ marginTop: '8px' }}>
                            <strong>Deadline:</strong> <span>{selectedTaskForPreview?.deadline}</span>
                        </div>
                        <hr className='divider' style={{ margin: '16px 0', border: 'none', borderTop: '1px solid var(--border-glass)' }} />
                        <label style={{ fontWeight: '600', display: 'block', marginBottom: '8px' }}>Submitted Work / Notes:</label>
                        <div className='submission-body-text' style={{ 
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
                            {selectedTaskForPreview?.submission || "No submission notes provided."}
                        </div>
                        <button className='close-btn-footer' onClick={()=>setShowSubmissionPreview(false)} style={{
                            marginTop: '20px',
                            background: 'transparent',
                            border: '1px solid var(--border-glass)',
                            color: 'var(--text-primary)',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: '600'
                        }}>Close</button>
                    </div>
                </div>
            }

            <ProgressBar isProgress={isProgress}/>
        </div>
    );
}

export default TaskManager;