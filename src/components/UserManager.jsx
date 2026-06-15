import React, { useEffect, useRef, useState } from 'react';
import './UserManager.css';
import ProgressBar from './ProgressBar';
import { apibaseurl, callApi, imgurl } from '../lib';

const UserManager = ({logout}) => {
    const [data, setData] = useState(null);
    const [token, setToken] = useState("");
    const [isProgress, setIsProgress] = useState("");
    const [activePage, setActivePage] = useState(0);
    const [showPopup, setShowPopup] = useState(false);
    const contentDiv = useRef();
    const fname = useRef();
    const [userData, setUserData] = useState(null);
    const [rolesData, setRolesData] = useState(null);
    const [errorData, setErrorData] = useState(null);
    const [selectedProfileUser, setSelectedProfileUser] = useState(null);

    // Role-based views & Teams States
    const [userRole, setUserRole] = useState(1);
    const [userId, setUserId] = useState(0);
    const [activeTab, setActiveTab] = useState("users"); // "users", "teams", "members"
    const [teamsList, setTeamsList] = useState([]);
    const [managersList, setManagersList] = useState([]);
    const [myTeam, setMyTeam] = useState(null);
    const [myTeamMembers, setMyTeamMembers] = useState([]);
    const [unassignedMembers, setUnassignedMembers] = useState([]);

    // Create Team popup states
    const [showCreateTeamPopup, setShowCreateTeamPopup] = useState(false);
    const [newTeamData, setNewTeamData] = useState({ teamName: "", description: "", deadline: "" });
    const [teamMembersMap, setTeamMembersMap] = useState({});
    const [allMembersList, setAllMembersList] = useState([]);
    const [teamLeadId, setTeamLeadId] = useState("");
    const [numTeamMembers, setNumTeamMembers] = useState(0);
    const [selectedTeamMembers, setSelectedTeamMembers] = useState(["", "", "", "", ""]);

    useEffect(() => {
        const storedtoken = localStorage.getItem("token");
        if (storedtoken == undefined || storedtoken == "")
            return logout();
            
        const ps = Math.floor((contentDiv.current.offsetHeight - 80) / 40);
        const pageSize = ps > 0 ? ps : 10;
        setToken(storedtoken);
        setIsProgress(true);

        // Decode token to find role & id
        try {
            const payload = JSON.parse(atob(storedtoken.split('.')[1]));
            setUserRole(payload.role);
            setUserId(payload.crid);
            if (payload.role === 2) {
                setActiveTab("members");
            }
        } catch (e) {
            console.error("Token decoding failed", e);
        }

        callApi("GET", apibaseurl + "/authservice/getallusers/1/" + pageSize, null, null, loadData, storedtoken);
    }, []);

    useEffect(() => {
        if (token && (activeTab === "teams" || activeTab === "members")) {
            loadTeamsData();
        }
    }, [activeTab, userRole, userId, token]);

    function loadUsers(page) {
        const ps = Math.floor((contentDiv.current.offsetHeight - 80) / 40);
        const pageSize = ps > 0 ? ps : 10;
        setIsProgress(true);
        setActivePage(page - 1);
        callApi("GET", apibaseurl + "/authservice/getallusers/" + page + "/" + pageSize, null, null, loadData, token);
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

    function loadTeamsData() {
        const storedtoken = token || localStorage.getItem("token");
        if (!storedtoken) return;

        setIsProgress(true);
        if (userRole === 3) {
            // Admin: Load teams and managers
            callApi("GET", apibaseurl + "/authservice/assignment/teams", null, null, (res) => {
                if (res.code === 200) {
                    const teams = res.teams || [];
                    setTeamsList(teams);
                    // Fetch members for each team
                    teams.forEach(team => {
                        callApi("GET", apibaseurl + "/authservice/assignment/team/members/" + team.id, null, null, (mRes) => {
                            if (mRes.code === 200) {
                                setTeamMembersMap(prev => ({ ...prev, [team.id]: mRes.users || [] }));
                            }
                        }, storedtoken);
                    });
                }
                callApi("GET", apibaseurl + "/authservice/assignment/team/managers", null, null, (mgrRes) => {
                    if (mgrRes.code === 200) {
                        setManagersList(mgrRes.users || []);
                    }
                    // Load all users to filter members for creation dropdown
                    callApi("GET", apibaseurl + "/authservice/getallusers/1/1000", null, null, (usersRes) => {
                        if (usersRes.code === 200) {
                            const members = (usersRes.users || []).filter(u => u.role === 1);
                            setAllMembersList(members);
                        }
                        setIsProgress(false);
                    }, storedtoken);
                }, storedtoken);
            }, storedtoken);
        } else if (userRole === 2) {
            // Team Lead: Find led team
            callApi("GET", apibaseurl + "/authservice/assignment/teams", null, null, (res) => {
                if (res.code === 200) {
                    const ledTeam = (res.teams || []).find(t => t.leaderId === userId);
                    if (ledTeam) {
                        setMyTeam(ledTeam);
                        // Fetch members of my team
                        callApi("GET", apibaseurl + "/authservice/assignment/team/members/" + ledTeam.id, null, null, (memRes) => {
                            if (memRes.code === 200) {
                                setMyTeamMembers(memRes.users || []);
                            }
                            // Fetch unassigned members
                            callApi("GET", apibaseurl + "/authservice/assignment/team/unassigned", null, null, (unRes) => {
                                if (unRes.code === 200) {
                                    setUnassignedMembers(unRes.users || []);
                                }
                                setIsProgress(false);
                            }, storedtoken);
                        }, storedtoken);
                    } else {
                        setMyTeam(null);
                        setMyTeamMembers([]);
                        setIsProgress(false);
                    }
                } else {
                    setIsProgress(false);
                }
            }, storedtoken);
        } else {
            setIsProgress(false);
        }
    }

    function assignTeamLead(teamId, leaderId) {
        setIsProgress(true);
        callApi("PUT", apibaseurl + `/authservice/assignment/team/assignleader/${teamId}/${leaderId}`, null, null, (res) => {
            setIsProgress(false);
            alert(res.message);
            loadTeamsData();
        }, token);
    }

    function handleCreateTeam(e) {
        e.preventDefault();
        if (!newTeamData.teamName.trim()) {
            alert("Team Name is required");
            return;
        }
        if (!newTeamData.deadline) {
            alert("Project Deadline is required");
            return;
        }
        setIsProgress(true);
        const membersToAssign = selectedTeamMembers.slice(0, numTeamMembers).filter(m => m !== "").map(m => parseInt(m));
        const payload = {
            title: newTeamData.teamName,
            description: newTeamData.description,
            teamLeadId: teamLeadId ? parseInt(teamLeadId) : 0,
            teamMembers: membersToAssign,
            priority: 0,
            deadline: newTeamData.deadline,
            status: 0
        };
        callApi("POST", apibaseurl + "/taskservice/createtask", payload, null, (res) => {
            setIsProgress(false);
            if (res.code === 200) {
                alert("Team and project created successfully");
                setShowCreateTeamPopup(false);
                setNewTeamData({ teamName: "", description: "", deadline: "" });
                setTeamLeadId("");
                setNumTeamMembers(0);
                setSelectedTeamMembers(["", "", "", "", ""]);
                loadTeamsData();
            } else {
                alert(res.message);
            }
        }, token);
    }

    function deleteTeam(id) {
        if (!confirm("Are you sure you want to delete this team?")) return;
        setIsProgress(true);
        callApi("DELETE", apibaseurl + `/authservice/assignment/team/delete/${id}`, null, null, (res) => {
            setIsProgress(false);
            alert(res.message);
            loadTeamsData();
        }, token);
    }

    function addMemberToTeam(memberId) {
        if (!myTeam) return;
        setIsProgress(true);
        callApi("PUT", apibaseurl + `/authservice/assignment/user/assignteam/${memberId}/${myTeam.id}`, null, null, (res) => {
            setIsProgress(false);
            alert(res.message);
            loadTeamsData();
        }, token);
    }

    function removeMemberFromTeam(memberId) {
        if (!confirm("Are you sure you want to remove this member from the team?")) return;
        setIsProgress(true);
        callApi("PUT", apibaseurl + `/authservice/assignment/user/assignteam/${memberId}/0`, null, null, (res) => {
            setIsProgress(false);
            alert(res.message);
            loadTeamsData();
        }, token);
    }

    function handleInput(e){
        const {name, value} = e.target;
        setUserData({...userData, [name] : value});
    }

    function addUser(){
        setIsProgress(true);
        setRolesData(null);
        setErrorData(null);
        setUserData({
            id: "",
            fullname: "",
            phone: "",
            email: "",
            password: "",
            role: 1,
            status: 1,
            skills: ""
        });
        setRolesData(data.roles);
        setShowPopup(true);
        setTimeout(() => {fname.current?.focus();}, 0);
        setIsProgress(false);
    }

    function editUser(id){
        setIsProgress(true);
        setRolesData(null);
        setErrorData(null);
        callApi("GET", apibaseurl + "/authservice/getuser/" + id, null, null, editUserHandler, token);
    }

    function editUserHandler(res){
        if(res.code !== 200){
            alert(res.message);
            setIsProgress(false);
            return;
        }
        setUserData(res.user);
        setRolesData(data.roles);
        setShowPopup(true);
        setTimeout(() => {fname.current?.focus();}, 0);
        setIsProgress(false);
    }

    function deleteUser(id){
        const resp = confirm("Click OK to delete");
        if(!resp)
            return;

        setIsProgress(true);
        callApi("DELETE", apibaseurl + "/authservice/deleteuser/" + id, null, null, deleteUserHandler, token);
    }

    function deleteUserHandler(res){
        alert(res.message);
        setIsProgress(false);
        loadUsers(activePage + 1);
    }

    function validateData(){
        let errors = {};
        if(userData.fullname === "") errors.fullname = true;
        if(userData.phone === "") errors.phone = true;
        if(userData.role === "") errors.role = true;
        if(userData.email === "") errors.email = true;
        if(userData.password === "") errors.password = true;
        setErrorData(errors);
        return Object.keys(errors).length > 0;
    }

    function saveUser(){
        if(validateData())
            return;

        setIsProgress(true);
        if(userData?.id === "")
            callApi("POST", apibaseurl + "/authservice/saveuser", userData, null, saveUserHandler, token);
        else
            callApi("PUT", apibaseurl + "/authservice/updateuser/" + userData?.id, userData, null, saveUserHandler, token);
    }

    function saveUserHandler(res){
        alert(res.message);
        setIsProgress(false);
        if(res.code !== 200)      
            return;

        setShowPopup(false);
        setUserData(null);
        loadUsers(activePage + 1);
    }

    return (
        <div className='umanager'>
            <div className='umanager-header'>
                <label>User & Team Manager</label>
                {userRole === 3 && (
                    <div className='umanager-tabs'>
                        <button 
                            className={activeTab === 'users' ? 'tab-btn active' : 'tab-btn'} 
                            onClick={() => setActiveTab('users')}
                        >
                            Manage Users
                        </button>
                        <button 
                            className={activeTab === 'teams' ? 'tab-btn active' : 'tab-btn'} 
                            onClick={() => setActiveTab('teams')}
                        >
                            Manage Teams
                        </button>
                    </div>
                )}
            </div>

            {activeTab === 'users' ? (
                // Users view
                <>
                    <div className='umanager-content' ref={contentDiv}>
                        <table>
                            <thead>
                                <tr>
                                    <th style={{'width':'50px'}}>S#</th>
                                    <th style={{'width':'250px'}}>Full Name</th>
                                    <th style={{'width':'150px'}}>Phone Number</th>
                                    <th style={{'width':'250px'}}>Registered Email</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {data?.users.map((user, index)=>(
                                    <tr key={user.id}>
                                        <td style={{'text-align':'center'}}>{((data.page - 1) * data.size) + (index + 1)}</td>
                                        <td>{user.fullname}</td>
                                        <td style={{'text-align':'center'}}>{user.phone}</td>
                                        <td>
                                            <span className='email-link' onClick={() => setSelectedProfileUser(user)}>
                                                {user.email}
                                            </span>
                                        </td>
                                        <td>
                                            <img src={imgurl + "edit.png"} alt='' onClick={()=>editUser(user.id)} />
                                            <img src={imgurl + "delete.png"} alt='' onClick={()=>deleteUser(user.id)} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className='umanager-footer'>
                        <button onClick={()=>addUser()}>Add New</button>
                        <div className='pages'>{
                            Array.from({ length: data?.totalpages}, (_, index) => (
                                <label key={index} className={index == activePage? 'active': ''} onClick={()=>loadUsers(index + 1)}>
                                    {index + 1}
                                </label>
                            ))
                        }</div>
                    </div>
                </>
            ) : activeTab === 'teams' ? (
                // Admin Teams view
                <div className='umanager-content' ref={contentDiv}>
                    <div className='teams-manager-section'>
                        <div className='section-actions'>
                            <button className='add-team-btn' onClick={() => setShowCreateTeamPopup(true)}>Create New Team</button>
                        </div>
                        <div className='teams-grid'>
                            {teamsList.length === 0 ? (
                                <p className='empty-message'>No teams created yet.</p>
                            ) : (
                                teamsList.map(team => {
                                    return (
                                        <div key={team.id} className='team-card-admin'>
                                            <div className='team-card-header'>
                                                <h4>{team.teamName}</h4>
                                                <button className='delete-team-btn' onClick={() => deleteTeam(team.id)}>Delete</button>
                                            </div>
                                            <p className='team-desc'>{team.description || 'No description provided.'}</p>
                                            <div className='team-lead-selector'>
                                                <label>Team Lead:</label>
                                                <select 
                                                    value={team.leaderId || ""} 
                                                    onChange={(e) => assignTeamLead(team.id, e.target.value ? parseInt(e.target.value) : 0)}
                                                >
                                                    <option value="">-- Unassigned --</option>
                                                    {managersList.map(mgr => (
                                                        <option key={mgr.id} value={mgr.id}>
                                                            {mgr.fullname} ({mgr.email})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className='team-members-list' style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                <label style={{ fontWeight: '600', fontSize: '13px', color: 'var(--text-secondary)' }}>Team Members:</label>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '120px', overflowY: 'auto' }}>
                                                    {teamMembersMap[team.id] && teamMembersMap[team.id].length > 0 ? (
                                                        teamMembersMap[team.id].map(mem => (
                                                            <span key={mem.id} style={{ fontSize: '13px', color: 'var(--text-primary)', padding: '4px 8px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '6px', border: '1px solid var(--border-glass)' }}>
                                                                {mem.fullname} ({mem.email})
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No members assigned.</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                // Team Lead Members view
                <div className='umanager-content' ref={contentDiv}>
                    <div className='members-manager-section'>
                        {!myTeam ? (
                            <div className='no-team-assigned'>
                                <p>You have not been assigned to lead any team yet.</p>
                                <p className='hint'>Please contact an Administrator to assign you a team.</p>
                            </div>
                        ) : (
                            <div className='team-lead-workspace'>
                                <div className='my-team-info-card'>
                                    <h3>Team: {myTeam.teamName}</h3>
                                    <p>{myTeam.description || 'No description provided.'}</p>
                                </div>
                                
                                <div className='add-member-control'>
                                    <label htmlFor='unassigned-select'>Add Member to Team:</label>
                                    <div className='inline-add-member'>
                                        <select id='unassigned-select' defaultValue="">
                                            <option value="" disabled>-- Select a Member --</option>
                                            {unassignedMembers.map(mem => (
                                                <option key={mem.id} value={mem.id}>
                                                    {mem.fullname} - Skills: {mem.skills || 'None'}
                                                </option>
                                            ))}
                                        </select>
                                        <button 
                                            className='add-btn-style'
                                            onClick={() => {
                                                const selectEl = document.getElementById('unassigned-select');
                                                if (selectEl && selectEl.value) {
                                                    addMemberToTeam(parseInt(selectEl.value));
                                                    selectEl.value = "";
                                                } else {
                                                    alert("Please select a member first");
                                                }
                                            }}
                                        >
                                            Add Member
                                        </button>
                                    </div>
                                </div>

                                <div className='team-roster'>
                                    <h4>Team Roster ({myTeamMembers.length} members)</h4>
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Name</th>
                                                <th>Email</th>
                                                <th>Skills</th>
                                                <th style={{ textAlign: 'center' }}>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {myTeamMembers.length === 0 ? (
                                                <tr>
                                                    <td colSpan='4' className='empty-roster'>No members in this team. Add some members above.</td>
                                                </tr>
                                            ) : (
                                                myTeamMembers.map(mem => (
                                                    <tr key={mem.id}>
                                                        <td>{mem.fullname}</td>
                                                        <td>{mem.email}</td>
                                                        <td>{mem.skills || 'None'}</td>
                                                        <td style={{ textAlign: 'center' }}>
                                                            <button 
                                                                className='remove-member-btn' 
                                                                onClick={() => removeMemberFromTeam(mem.id)}
                                                            >
                                                                Remove
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Create Team Popup Modal */}
            {showCreateTeamPopup && (
                <div className='overlay'>
                    <div className='popup' style={{ maxHeight: '90vh', overflowY: 'auto', width: '450px' }}>
                        <span className='close' onClick={() => setShowCreateTeamPopup(false)}>&times;</span>
                        <h3>Create New Team</h3>
                        <form onSubmit={handleCreateTeam} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <label>Team Name*</label>
                            <input 
                                type='text' 
                                required 
                                value={newTeamData.teamName} 
                                onChange={(e) => setNewTeamData({ ...newTeamData, teamName: e.target.value })} 
                                placeholder='E.g., Alpha Squad'
                            />
                            <label>Description</label>
                            <textarea 
                                rows='2' 
                                value={newTeamData.description} 
                                onChange={(e) => setNewTeamData({ ...newTeamData, description: e.target.value })} 
                                placeholder='Describe the team responsibilities...'
                            />
                            <label>Project Deadline*</label>
                            <input 
                                type='date' 
                                required 
                                value={newTeamData.deadline || ""} 
                                onChange={(e) => setNewTeamData({ ...newTeamData, deadline: e.target.value })} 
                                style={{ height: '33px', padding: '6px 12px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: 'var(--text-primary)', marginBottom: '8px' }}
                            />
                            <label>Assign Team Lead</label>
                            <select 
                                value={teamLeadId} 
                                onChange={(e) => setTeamLeadId(e.target.value)}
                            >
                                <option value="">-- Select Team Lead --</option>
                                {managersList.map(mgr => (
                                    <option key={mgr.id} value={mgr.id}>
                                        {mgr.fullname} ({mgr.email})
                                    </option>
                                ))}
                            </select>

                            <label>Number of Team Members</label>
                            <select 
                                value={numTeamMembers} 
                                onChange={(e) => setNumTeamMembers(parseInt(e.target.value))}
                            >
                                {[0, 1, 2, 3, 4, 5].map(n => (
                                    <option key={n} value={n}>{n}</option>
                                ))}
                            </select>

                            {Array.from({ length: numTeamMembers }).map((_, idx) => (
                                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <label>Team Member {idx + 1}</label>
                                    <select
                                        value={selectedTeamMembers[idx] || ""}
                                        onChange={(e) => {
                                            const newSelected = [...selectedTeamMembers];
                                            newSelected[idx] = e.target.value;
                                            setSelectedTeamMembers(newSelected);
                                        }}
                                    >
                                        <option value="">-- Select Team Member --</option>
                                        {allMembersList.map(mem => (
                                            <option key={mem.id} value={mem.id}>
                                                {mem.fullname} ({mem.email})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            ))}

                            <button type='submit'>Create Team</button>
                        </form>
                    </div>
                </div>
            )}

            {showPopup && 
                <div className='overlay'>
                    <div className='popup'>
                        <span className='close' onClick={()=>setShowPopup(false)}>&times;</span>
                        <h3>{userData?.id == "" ? "New User" : "Update User"}</h3>
                        <label>Full Name*</label>
                        <input type='text' ref={fname} className={errorData?.fullname ? 'error' : ''} autoComplete='off' name='fullname' value={userData?.fullname} onChange={(e)=>handleInput(e)} />
                        <label>Phone Number*</label>
                        <input type='text' className={errorData?.phone ? 'error' : ''} autoComplete='off' name='phone' value={userData?.phone} onChange={(e)=>handleInput(e)} />
                        <label>Role*</label>
                        <select className={errorData?.role ? 'error' : ''} disabled={userData?.id === ""} name='role' value={userData?.role} onChange={(e)=>handleInput(e)}>
                            {rolesData?.map((r)=>(
                                <option value={r.role}>{r.rolename}</option>
                            ))}
                        </select>
                        <label>Email*</label>
                        <input type='text' className={errorData?.email ? 'error' : ''} autoComplete='off' name='email' value={userData?.email} onChange={(e)=>handleInput(e)} />
                        <label>Password*</label>
                        <input type='password' className={errorData?.password ? 'error' : ''} autoComplete='off' name='password' value={userData?.password} onChange={(e)=>handleInput(e)} />
                        <label>Skills</label>
                        <input type='text' autoComplete='off' name='skills' value={userData?.skills || ''} onChange={(e)=>handleInput(e)} />
                        <button onClick={()=>saveUser()}>{userData?.id == "" ? "Save" : "Update"}</button>
                    </div>
                </div>
            }

            {selectedProfileUser && 
                <div className='overlay'>
                    <div className='popup' style={{ maxWidth: '420px', padding: '30px' }}>
                        <span className='close' onClick={()=>setSelectedProfileUser(null)}>&times;</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', paddingBottom: '20px', borderBottom: '1px solid var(--border-glass)', marginBottom: '20px' }}>
                            <img src={imgurl + "user.png"} alt='' style={{ height: '64px', width: '64px', borderRadius: '50%', border: '2px solid var(--primary-color)', padding: '4px', background: 'rgba(255, 255, 255, 0.02)', filter: 'invert(1)' }} />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>{selectedProfileUser.fullname}</label>
                                <span style={{ fontSize: '12px', color: 'var(--primary-color)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    {data?.roles?.find(r => r.role === selectedProfileUser.role)?.rolename || 'User'}
                                </span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px auto', padding: '12px 14px', background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-glass)', borderRadius: '10px' }}>
                                <span style={{ fontWeight: '600', color: 'var(--text-secondary)', fontSize: '13px' }}>Full Name</span>
                                <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>{selectedProfileUser.fullname}</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px auto', padding: '12px 14px', background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-glass)', borderRadius: '10px' }}>
                                <span style={{ fontWeight: '600', color: 'var(--text-secondary)', fontSize: '13px' }}>Phone Number</span>
                                <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>{selectedProfileUser.phone}</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px auto', padding: '12px 14px', background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-glass)', borderRadius: '10px' }}>
                                <span style={{ fontWeight: '600', color: 'var(--text-secondary)', fontSize: '13px' }}>Email Address</span>
                                <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>{selectedProfileUser.email}</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px auto', padding: '12px 14px', background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-glass)', borderRadius: '10px' }}>
                                <span style={{ fontWeight: '600', color: 'var(--text-secondary)', fontSize: '13px' }}>Skills</span>
                                <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>{selectedProfileUser.skills || 'None'}</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px auto', padding: '12px 14px', background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-glass)', borderRadius: '10px' }}>
                                <span style={{ fontWeight: '600', color: 'var(--text-secondary)', fontSize: '13px' }}>Status</span>
                                <span style={{ color: selectedProfileUser.status === 1 ? '#4ade80' : '#f87171', fontWeight: '600', fontSize: '13px' }}>
                                    {selectedProfileUser.status === 1 ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            }

            <ProgressBar isProgress={isProgress}/>
        </div>
    );
}

export default UserManager;
